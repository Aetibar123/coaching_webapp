import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateAssignmentDto,
  SubmitAssignmentDto,
  QueryAssignmentDto,
} from './assignment.dto';

export interface AssignmentRecord {
  id: string;
  batch_id: string | number;
  batch_name?: string;
  course?: string;
  class_id?: string | null;
  class_title?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  total_points: number;
  created_by?: string | null;
  status: string;
  questions_count?: number;
  submissions_count?: number;
  created_at?: string;
  updated_at?: string;
  questions?: McqQuestionRecord[];
}

export interface McqQuestionRecord {
  id: string;
  assignment_id: string;
  question_text: string;
  options: string[];
  correct_option?: number; // Hidden from students before/during submission
  points: number;
  order_index: number;
}

export interface AssignmentSubmissionRecord {
  id: string;
  assignment_id: string;
  student_id: string | number;
  student_name: string;
  student_email?: string;
  answers: {
    question_id: string;
    question_text: string;
    selected_option: number;
    correct_option?: number;
    is_correct: boolean;
    points_awarded: number;
    max_points: number;
  }[];
  score: number;
  total_points: number;
  percentage: number;
  status: string;
  submitted_at: string;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Helper to retrieve batches assigned to a teacher
   */
  private async getTeacherBatchIds(email?: string): Promise<(string | number)[]> {
    if (!email) return [];
    const supabase = this.supabaseService.getClient();

    try {
      const teacherRes = (await supabase
        .from('teachers')
        .select('id, name')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()) as {
        data: { id: string; name: string } | null;
        error: { message: string } | null;
      };

      if (!teacherRes.data) return [];
      const teacherName = teacherRes.data.name;

      const batchesRes = (await supabase
        .from('batch')
        .select('id')
        .or(`teacher_id.eq.${teacherRes.data.id},instructor.ilike.%${teacherName}%`)) as {
        data: { id: string | number }[] | null;
        error: { message: string } | null;
      };

      if (batchesRes.data) {
        return batchesRes.data.map((b) => b.id);
      }
    } catch (err) {
      this.logger.warn(`Could not fetch teacher batches for ${email}:`, err);
    }

    return [];
  }

  /**
   * Create an assignment with MCQ questions
   */
  async createAssignment(
    createDto: CreateAssignmentDto,
    creatorEmail?: string,
  ): Promise<AssignmentRecord> {
    const supabase = this.supabaseService.getClient();

    // 1. Verify batch exists
    const batchRes = (await supabase
      .from('batch')
      .select('id, name, course')
      .eq('id', createDto.batch_id)
      .maybeSingle()) as {
      data: { id: string | number; name: string; course: string } | null;
      error: { message: string } | null;
    };

    if (batchRes.error || !batchRes.data) {
      throw new BadRequestException(
        `Batch with ID "${createDto.batch_id}" does not exist.`,
      );
    }

    // Check if creator is teacher, verify authorization to create assignment for this batch
    if (creatorEmail) {
      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const isAdmin = adminEmails.includes(creatorEmail.toLowerCase());

      if (!isAdmin) {
        const teacherBatchIds = await this.getTeacherBatchIds(creatorEmail);
        if (teacherBatchIds.length > 0) {
          const isAllowed = teacherBatchIds.some(
            (bId) => String(bId) === String(createDto.batch_id),
          );
          if (!isAllowed) {
            throw new BadRequestException(
              'Teachers can only create assignments for their assigned batches.',
            );
          }
        }
      }
    }

    // 2. Validate questions
    if (!createDto.questions || createDto.questions.length === 0) {
      throw new BadRequestException('Assignment must have at least one question.');
    }

    for (let i = 0; i < createDto.questions.length; i++) {
      const q = createDto.questions[i];
      if (!q.question_text?.trim()) {
        throw new BadRequestException(`Question #${i + 1} is missing question text.`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new BadRequestException(
          `Question #${i + 1} must contain at least 2 options.`,
        );
      }
      if (
        typeof q.correct_option !== 'number' ||
        q.correct_option < 0 ||
        q.correct_option >= q.options.length
      ) {
        throw new BadRequestException(
          `Question #${i + 1} has an invalid correct option index. Must be between 0 and ${
            q.options.length - 1
          }.`,
        );
      }
    }

    // Calculate total points
    const totalPoints = createDto.questions.reduce(
      (sum, q) => sum + (Number(q.points) || 1),
      0,
    );

    // 3. Insert assignment
    const assignmentPayload = {
      batch_id: createDto.batch_id,
      class_id: createDto.class_id || null,
      title: createDto.title.trim(),
      description: createDto.description?.trim() || null,
      due_date: createDto.due_date || null,
      total_points: totalPoints,
      created_by: creatorEmail || null,
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const assignmentRes = (await supabase
      .from('assignments')
      .insert(assignmentPayload)
      .select()
      .single()) as {
      data: AssignmentRecord | null;
      error: { message: string } | null;
    };

    if (assignmentRes.error || !assignmentRes.data) {
      this.logger.error('Failed to insert assignment:', assignmentRes.error);
      throw new InternalServerErrorException(
        `Failed to create assignment: ${assignmentRes.error?.message || 'Database error'}`,
      );
    }

    const createdAssignment = assignmentRes.data;

    // 4. Insert MCQ questions
    const questionRows = createDto.questions.map((q, idx) => ({
      assignment_id: createdAssignment.id,
      question_text: q.question_text.trim(),
      options: q.options,
      correct_option: q.correct_option,
      points: Number(q.points) || 1,
      order_index: idx,
    }));

    const questionsRes = (await supabase
      .from('assignment_questions')
      .insert(questionRows)
      .select()) as {
      data: McqQuestionRecord[] | null;
      error: { message: string } | null;
    };

    if (questionsRes.error) {
      this.logger.error('Failed to insert questions:', questionsRes.error);
      // Clean up assignment if questions failed
      await supabase.from('assignments').delete().eq('id', createdAssignment.id);
      throw new InternalServerErrorException(
        `Failed to save assignment questions: ${questionsRes.error.message}`,
      );
    }

    return {
      ...createdAssignment,
      batch_name: batchRes.data.name,
      course: batchRes.data.course,
      questions: questionsRes.data || [],
      questions_count: questionsRes.data?.length || 0,
      submissions_count: 0,
    };
  }

  /**
   * Find all assignments matching filters
   */
  async findAllAssignments(
    query: QueryAssignmentDto,
    userRole?: string,
    userEmail?: string,
  ): Promise<AssignmentRecord[]> {
    const supabase = this.supabaseService.getClient();

    let queryBuilder = supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    // Role filtering for teachers
    if (userRole === 'teacher' || query.teacher_email) {
      const email = query.teacher_email || userEmail;
      const teacherBatchIds = await this.getTeacherBatchIds(email);
      if (teacherBatchIds.length > 0) {
        queryBuilder = queryBuilder.in('batch_id', teacherBatchIds);
      } else {
        return [];
      }
    }

    if (query.batch_id) {
      queryBuilder = queryBuilder.eq('batch_id', query.batch_id);
    }

    if (query.class_id) {
      queryBuilder = queryBuilder.eq('class_id', query.class_id);
    }

    const { data: assignments, error } = (await queryBuilder) as {
      data: AssignmentRecord[] | null;
      error: { message: string } | null;
    };

    if (error) {
      this.logger.error('Error fetching assignments:', error);
      throw new InternalServerErrorException(error.message);
    }

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Enrich with batch names, class titles, questions count, and submissions count
    const batchIds = Array.from(new Set(assignments.map((a) => a.batch_id)));
    const classIds = Array.from(
      new Set(assignments.map((a) => a.class_id).filter(Boolean)),
    ) as string[];
    const assignmentIds = assignments.map((a) => a.id);

    // Fetch batches
    const { data: batches } = (await supabase
      .from('batch')
      .select('id, name, course')
      .in('id', batchIds)) as {
      data: { id: string | number; name: string; course: string }[] | null;
    };
    const batchMap = new Map((batches || []).map((b) => [String(b.id), b]));

    // Fetch classes if any
    const classMap = new Map<string, string>();
    if (classIds.length > 0) {
      const { data: classes } = (await supabase
        .from('classes')
        .select('id, title')
        .in('id', classIds)) as {
        data: { id: string; title: string }[] | null;
      };
      (classes || []).forEach((c) => classMap.set(c.id, c.title));
    }

    // Fetch questions count for each assignment
    const { data: questions } = (await supabase
      .from('assignment_questions')
      .select('id, assignment_id')
      .in('assignment_id', assignmentIds)) as {
      data: { id: string; assignment_id: string }[] | null;
    };
    const questionsCountMap = new Map<string, number>();
    (questions || []).forEach((q) => {
      questionsCountMap.set(
        q.assignment_id,
        (questionsCountMap.get(q.assignment_id) || 0) + 1,
      );
    });

    // Fetch submissions count
    const { data: submissions } = (await supabase
      .from('assignment_submissions')
      .select('id, assignment_id')
      .in('assignment_id', assignmentIds)) as {
      data: { id: string; assignment_id: string }[] | null;
    };
    const submissionsCountMap = new Map<string, number>();
    (submissions || []).forEach((s) => {
      submissionsCountMap.set(
        s.assignment_id,
        (submissionsCountMap.get(s.assignment_id) || 0) + 1,
      );
    });

    return assignments.map((a) => {
      const b = batchMap.get(String(a.batch_id));
      return {
        ...a,
        batch_name: b?.name,
        course: b?.course,
        class_title: a.class_id ? classMap.get(a.class_id) || null : null,
        questions_count: questionsCountMap.get(a.id) || 0,
        submissions_count: submissionsCountMap.get(a.id) || 0,
      };
    });
  }

  /**
   * Find an assignment by ID (optionally including correct answers if teacher/admin)
   */
  async findAssignmentById(
    id: string,
    isTeacherOrAdmin: boolean = false,
  ): Promise<AssignmentRecord> {
    const supabase = this.supabaseService.getClient();

    const { data: assignment, error } = (await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .maybeSingle()) as {
      data: AssignmentRecord | null;
      error: { message: string } | null;
    };

    if (error || !assignment) {
      throw new NotFoundException(`Assignment with ID "${id}" not found.`);
    }

    // Fetch batch
    const { data: batch } = (await supabase
      .from('batch')
      .select('id, name, course')
      .eq('id', assignment.batch_id)
      .maybeSingle()) as {
      data: { id: string | number; name: string; course: string } | null;
    };

    // Fetch class title if linked
    let classTitle: string | null = null;
    if (assignment.class_id) {
      const { data: cls } = (await supabase
        .from('classes')
        .select('title')
        .eq('id', assignment.class_id)
        .maybeSingle()) as { data: { title: string } | null };
      if (cls) classTitle = cls.title;
    }

    // Fetch questions
    const { data: questions } = (await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', id)
      .order('order_index', { ascending: true })) as {
      data: McqQuestionRecord[] | null;
    };

    // If student is attempting, hide correct_option to prevent cheating!
    const sanitizedQuestions = (questions || []).map((q) => {
      if (!isTeacherOrAdmin) {
        const { correct_option, ...rest } = q;
        return rest as McqQuestionRecord;
      }
      return q;
    });

    return {
      ...assignment,
      batch_name: batch?.name,
      course: batch?.course,
      class_title: classTitle,
      questions: sanitizedQuestions,
      questions_count: sanitizedQuestions.length,
    };
  }

  /**
   * Submit an assignment attempt by a student
   */
  async submitAssignment(
    assignmentId: string,
    submitDto: SubmitAssignmentDto,
  ): Promise<AssignmentSubmissionRecord> {
    const supabase = this.supabaseService.getClient();

    // 1. Fetch assignment and all questions with correct_option
    const { data: assignment, error: assignmentError } = (await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle()) as {
      data: AssignmentRecord | null;
      error: { message: string } | null;
    };

    if (assignmentError || !assignment) {
      throw new NotFoundException(`Assignment with ID "${assignmentId}" not found.`);
    }

    const { data: questions, error: questionsError } = (await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('order_index', { ascending: true })) as {
      data: McqQuestionRecord[] | null;
      error: { message: string } | null;
    };

    if (questionsError || !questions || questions.length === 0) {
      throw new BadRequestException('This assignment does not contain any questions.');
    }

    // 2. Fetch student details
    let studentName = submitDto.student_name || 'Student';
    let studentEmail = submitDto.student_email || '';

    const { data: student } = (await supabase
      .from('student')
      .select('id, name, email')
      .eq('id', submitDto.student_id)
      .maybeSingle()) as {
      data: { id: string | number; name: string; email: string } | null;
    };

    if (student) {
      studentName = student.name;
      studentEmail = student.email || studentEmail;
    }

    // 3. Grade answers
    const questionMap = new Map<string, McqQuestionRecord>();
    questions.forEach((q) => questionMap.set(q.id, q));

    const answerMap = new Map<string, number>();
    (submitDto.answers || []).forEach((a) => {
      answerMap.set(a.question_id, a.selected_option);
    });

    let earnedScore = 0;
    let totalPossiblePoints = 0;

    const evaluatedAnswers = questions.map((q) => {
      const selectedOption = answerMap.has(q.id) ? answerMap.get(q.id)! : -1;
      const points = Number(q.points) || 1;
      totalPossiblePoints += points;

      const isCorrect = selectedOption === q.correct_option;
      const pointsAwarded = isCorrect ? points : 0;
      earnedScore += pointsAwarded;

      return {
        question_id: q.id,
        question_text: q.question_text,
        selected_option: selectedOption,
        correct_option: q.correct_option,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        max_points: points,
      };
    });

    const percentage =
      totalPossiblePoints > 0
        ? Math.round((earnedScore / totalPossiblePoints) * 10000) / 100
        : 0;

    // 4. Save submission into assignment_submissions (check if existing)
    const { data: existingSub } = (await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', submitDto.student_id)
      .maybeSingle()) as { data: { id: string } | null };

    const submissionPayload = {
      assignment_id: assignmentId,
      student_id: submitDto.student_id,
      student_name: studentName,
      student_email: studentEmail || null,
      answers: evaluatedAnswers,
      score: earnedScore,
      total_points: totalPossiblePoints,
      percentage: percentage,
      status: 'graded',
      submitted_at: new Date().toISOString(),
    };

    let resultRecord: AssignmentSubmissionRecord;

    if (existingSub) {
      // Update existing attempt
      const { data: updated, error: updateError } = (await supabase
        .from('assignment_submissions')
        .update(submissionPayload)
        .eq('id', existingSub.id)
        .select()
        .single()) as {
        data: AssignmentSubmissionRecord | null;
        error: { message: string } | null;
      };

      if (updateError || !updated) {
        throw new InternalServerErrorException(
          `Failed to update submission: ${updateError?.message}`,
        );
      }
      resultRecord = updated;
    } else {
      // Insert new submission
      const { data: inserted, error: insertError } = (await supabase
        .from('assignment_submissions')
        .insert(submissionPayload)
        .select()
        .single()) as {
        data: AssignmentSubmissionRecord | null;
        error: { message: string } | null;
      };

      if (insertError || !inserted) {
        throw new InternalServerErrorException(
          `Failed to record submission: ${insertError?.message}`,
        );
      }
      resultRecord = inserted;
    }

    return resultRecord;
  }

  /**
   * Get all submissions for an assignment (Teacher view)
   */
  async getAssignmentSubmissions(assignmentId: string): Promise<{
    assignment: AssignmentRecord;
    total_enrolled: number;
    submitted_count: number;
    average_score: number;
    submissions: AssignmentSubmissionRecord[];
    pending_students: { id: string | number; name: string; email: string }[];
  }> {
    const supabase = this.supabaseService.getClient();

    // 1. Get assignment
    const assignment = await this.findAssignmentById(assignmentId, true);

    // 2. Get all submissions
    const { data: submissions, error: subError } = (await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })) as {
      data: AssignmentSubmissionRecord[] | null;
      error: { message: string } | null;
    };

    if (subError) {
      throw new InternalServerErrorException(subError.message);
    }

    const subList = submissions || [];

    // 3. Fetch all students in the batch
    const { data: enrolledStudents } = (await supabase
      .from('student')
      .select('id, name, email')
      .eq('batch_id', assignment.batch_id)) as {
      data: { id: string | number; name: string; email: string }[] | null;
    };

    const enrolledList = enrolledStudents || [];
    const submittedStudentIds = new Set(subList.map((s) => String(s.student_id)));

    const pendingStudents = enrolledList.filter(
      (s) => !submittedStudentIds.has(String(s.id)),
    );

    const averageScore =
      subList.length > 0
        ? Math.round(
            (subList.reduce((acc, cur) => acc + (cur.score || 0), 0) /
              subList.length) *
              100,
          ) / 100
        : 0;

    return {
      assignment,
      total_enrolled: enrolledList.length,
      submitted_count: subList.length,
      average_score: averageScore,
      submissions: subList,
      pending_students: pendingStudents,
    };
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(id: string): Promise<{ success: boolean; message: string }> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('assignments').delete().eq('id', id);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to delete assignment: ${error.message}`,
      );
    }

    return {
      success: true,
      message: `Assignment ${id} deleted successfully`,
    };
  }
}

