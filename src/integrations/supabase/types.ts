export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_calendar_events: {
        Row: {
          academic_year_id: string | null
          applicable_year: number | null
          created_at: string
          department_id: string | null
          description: string | null
          end_date: string
          event_type: string
          id: string
          is_holiday: boolean | null
          is_working_day: boolean | null
          program_id: string | null
          recurrence: string | null
          section_id: string | null
          start_date: string
          title: string
        }
        Insert: {
          academic_year_id?: string | null
          applicable_year?: number | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          end_date: string
          event_type?: string
          id?: string
          is_holiday?: boolean | null
          is_working_day?: boolean | null
          program_id?: string | null
          recurrence?: string | null
          section_id?: string | null
          start_date: string
          title: string
        }
        Update: {
          academic_year_id?: string | null
          applicable_year?: number | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          is_holiday?: boolean | null
          is_working_day?: boolean | null
          program_id?: string | null
          recurrence?: string | null
          section_id?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_events_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_events_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      admissions: {
        Row: {
          academic_year_id: string | null
          admission_quota: string | null
          applicant_name: string
          application_number: string | null
          applied_at: string
          category: string | null
          converted_to_student: boolean | null
          created_at: string
          date_of_birth: string | null
          documents_verified: boolean | null
          email: string
          fee_paid: boolean | null
          gender: string | null
          id: string
          merit_rank: number | null
          merit_score: number | null
          phone: string | null
          program_id: string | null
          remarks: string | null
          seat_allotted: boolean | null
          status: string
          student_profile_id: string | null
        }
        Insert: {
          academic_year_id?: string | null
          admission_quota?: string | null
          applicant_name: string
          application_number?: string | null
          applied_at?: string
          category?: string | null
          converted_to_student?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          documents_verified?: boolean | null
          email: string
          fee_paid?: boolean | null
          gender?: string | null
          id?: string
          merit_rank?: number | null
          merit_score?: number | null
          phone?: string | null
          program_id?: string | null
          remarks?: string | null
          seat_allotted?: boolean | null
          status?: string
          student_profile_id?: string | null
        }
        Update: {
          academic_year_id?: string | null
          admission_quota?: string | null
          applicant_name?: string
          application_number?: string | null
          applied_at?: string
          category?: string | null
          converted_to_student?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          documents_verified?: boolean | null
          email?: string
          fee_paid?: boolean | null
          gender?: string | null
          id?: string
          merit_rank?: number | null
          merit_score?: number | null
          phone?: string | null
          program_id?: string | null
          remarks?: string | null
          seat_allotted?: boolean | null
          status?: string
          student_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissions_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allowance_types: {
        Row: {
          created_at: string
          default_value: number
          id: string
          is_percentage: boolean
          name: string
        }
        Insert: {
          created_at?: string
          default_value?: number
          id?: string
          is_percentage?: boolean
          name: string
        }
        Update: {
          created_at?: string
          default_value?: number
          id?: string
          is_percentage?: boolean
          name?: string
        }
        Relationships: []
      }
      attendance_alerts: {
        Row: {
          alert_type: string
          course_id: string | null
          created_at: string
          current_percentage: number | null
          id: string
          is_read: boolean | null
          message: string | null
          parent_email: string | null
          parent_phone: string | null
          recipient_type: string | null
          sent_at: string
          sent_via: Json | null
          student_id: string
          threshold: number | null
        }
        Insert: {
          alert_type: string
          course_id?: string | null
          created_at?: string
          current_percentage?: number | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          recipient_type?: string | null
          sent_at?: string
          sent_via?: Json | null
          student_id: string
          threshold?: number | null
        }
        Update: {
          alert_type?: string
          course_id?: string | null
          created_at?: string
          current_percentage?: number | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          recipient_type?: string | null
          sent_at?: string
          sent_via?: Json | null
          student_id?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_alerts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_condonations: {
        Row: {
          applied_at: string
          approved_dates: Json | null
          class_teacher_remarks: string | null
          condone_dates: Json
          course_id: string
          created_at: string
          deadline: string | null
          document_url: string | null
          faculty_remarks: string | null
          hod_remarks: string | null
          id: string
          reason: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          approved_dates?: Json | null
          class_teacher_remarks?: string | null
          condone_dates?: Json
          course_id: string
          created_at?: string
          deadline?: string | null
          document_url?: string | null
          faculty_remarks?: string | null
          hod_remarks?: string | null
          id?: string
          reason: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          approved_dates?: Json | null
          class_teacher_remarks?: string | null
          condone_dates?: Json
          course_id?: string
          created_at?: string
          deadline?: string | null
          document_url?: string | null
          faculty_remarks?: string | null
          hod_remarks?: string | null
          id?: string
          reason?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_condonations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_condonations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_config: {
        Row: {
          alert_threshold_critical: number | null
          alert_threshold_danger: number | null
          alert_threshold_warning: number | null
          allow_past_date_days: number | null
          condonation_limit_percent: number | null
          course_id: string | null
          created_at: string
          department_id: string | null
          detention_threshold: number | null
          grace_period_minutes: number | null
          id: string
          late_marking_window_minutes: number | null
          marking_deadline_hours: number | null
          min_attendance_lab: number | null
          min_attendance_overall: number
          min_attendance_theory: number | null
          program_id: string | null
          session_type: string
          track_theory_lab_separately: boolean | null
          updated_at: string
        }
        Insert: {
          alert_threshold_critical?: number | null
          alert_threshold_danger?: number | null
          alert_threshold_warning?: number | null
          allow_past_date_days?: number | null
          condonation_limit_percent?: number | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          detention_threshold?: number | null
          grace_period_minutes?: number | null
          id?: string
          late_marking_window_minutes?: number | null
          marking_deadline_hours?: number | null
          min_attendance_lab?: number | null
          min_attendance_overall?: number
          min_attendance_theory?: number | null
          program_id?: string | null
          session_type?: string
          track_theory_lab_separately?: boolean | null
          updated_at?: string
        }
        Update: {
          alert_threshold_critical?: number | null
          alert_threshold_danger?: number | null
          alert_threshold_warning?: number | null
          allow_past_date_days?: number | null
          condonation_limit_percent?: number | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          detention_threshold?: number | null
          grace_period_minutes?: number | null
          id?: string
          late_marking_window_minutes?: number | null
          marking_deadline_hours?: number | null
          min_attendance_lab?: number | null
          min_attendance_overall?: number
          min_attendance_theory?: number | null
          program_id?: string | null
          session_type?: string
          track_theory_lab_separately?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_config_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_config_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_config_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          approved_by: string | null
          attendance_record_id: string
          corrected_status: string
          corrected_type_id: string | null
          correction_deadline: string | null
          created_at: string
          id: string
          is_bulk: boolean | null
          original_status: string
          original_type_id: string | null
          proof_url: string | null
          reason: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          attendance_record_id: string
          corrected_status: string
          corrected_type_id?: string | null
          correction_deadline?: string | null
          created_at?: string
          id?: string
          is_bulk?: boolean | null
          original_status: string
          original_type_id?: string | null
          proof_url?: string | null
          reason: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          attendance_record_id?: string
          corrected_status?: string
          corrected_type_id?: string | null
          correction_deadline?: string | null
          created_at?: string
          id?: string
          is_bulk?: boolean | null
          original_status?: string
          original_type_id?: string | null
          proof_url?: string | null
          reason?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_corrected_type_id_fkey"
            columns: ["corrected_type_id"]
            isOneToOne: false
            referencedRelation: "attendance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_original_type_id_fkey"
            columns: ["original_type_id"]
            isOneToOne: false
            referencedRelation: "attendance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_periods: {
        Row: {
          created_at: string
          department_id: string | null
          end_time: string
          id: string
          is_lab_slot: boolean | null
          name: string
          period_number: number
          session_label: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          end_time: string
          id?: string
          is_lab_slot?: boolean | null
          name: string
          period_number: number
          session_label?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          end_time?: string
          id?: string
          is_lab_slot?: boolean | null
          name?: string
          period_number?: number
          session_label?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_periods_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_type_id: string | null
          course_id: string
          created_at: string
          date: string
          id: string
          is_draft: boolean | null
          is_locked: boolean | null
          is_theory: boolean | null
          marked_by: string | null
          period_id: string | null
          remarks: string | null
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          attendance_type_id?: string | null
          course_id: string
          created_at?: string
          date: string
          id?: string
          is_draft?: boolean | null
          is_locked?: boolean | null
          is_theory?: boolean | null
          marked_by?: string | null
          period_id?: string | null
          remarks?: string | null
          status?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          attendance_type_id?: string | null
          course_id?: string
          created_at?: string
          date?: string
          id?: string
          is_draft?: boolean | null
          is_locked?: boolean | null
          is_theory?: boolean | null
          marked_by?: string | null
          period_id?: string | null
          remarks?: string | null
          status?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_attendance_type_id_fkey"
            columns: ["attendance_type_id"]
            isOneToOne: false
            referencedRelation: "attendance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "attendance_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_types: {
        Row: {
          code: string
          color: string | null
          counts_as_present: boolean
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number | null
        }
        Insert: {
          code: string
          color?: string | null
          counts_as_present?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          color?: string | null
          counts_as_present?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      batches: {
        Row: {
          academic_year_id: string | null
          admission_year: number
          created_at: string
          current_year: number
          id: string
          name: string
          passout_year: number
          program_id: string
          regulation_id: string | null
          status: string
          total_intake: number
        }
        Insert: {
          academic_year_id?: string | null
          admission_year: number
          created_at?: string
          current_year?: number
          id?: string
          name: string
          passout_year: number
          program_id: string
          regulation_id?: string | null
          status?: string
          total_intake?: number
        }
        Update: {
          academic_year_id?: string | null
          admission_year?: number
          created_at?: string
          current_year?: number
          id?: string
          name?: string
          passout_year?: number
          program_id?: string
          regulation_id?: string | null
          status?: string
          total_intake?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          course_id: string
          created_at: string
          date: string
          faculty_id: string | null
          guest_lecturer_name: string | null
          id: string
          is_combined_section: boolean | null
          is_conducted: boolean | null
          is_divided_batch: boolean | null
          is_guest_lecture: boolean | null
          is_makeup: boolean | null
          is_theory: boolean | null
          not_conducted_reason: string | null
          period_id: string | null
          section_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          date: string
          faculty_id?: string | null
          guest_lecturer_name?: string | null
          id?: string
          is_combined_section?: boolean | null
          is_conducted?: boolean | null
          is_divided_batch?: boolean | null
          is_guest_lecture?: boolean | null
          is_makeup?: boolean | null
          is_theory?: boolean | null
          not_conducted_reason?: string | null
          period_id?: string | null
          section_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          date?: string
          faculty_id?: string | null
          guest_lecturer_name?: string | null
          id?: string
          is_combined_section?: boolean | null
          is_conducted?: boolean | null
          is_divided_batch?: boolean | null
          is_guest_lecture?: boolean | null
          is_makeup?: boolean | null
          is_theory?: boolean | null
          not_conducted_reason?: string | null
          period_id?: string | null
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "attendance_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          course_id: string
          created_at: string
          id: string
          registered_at: string
          registration_window_id: string | null
          remarks: string | null
          status: string
          student_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          course_id: string
          created_at?: string
          id?: string
          registered_at?: string
          registration_window_id?: string | null
          remarks?: string | null
          status?: string
          student_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          course_id?: string
          created_at?: string
          id?: string
          registered_at?: string
          registration_window_id?: string | null
          remarks?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_registration_window_id_fkey"
            columns: ["registration_window_id"]
            isOneToOne: false
            referencedRelation: "registration_windows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedules: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          contact_hours: number | null
          course_type: string
          created_at: string
          credits: number
          department_id: string | null
          description: string | null
          faculty_id: string | null
          id: string
          lab_credits: number | null
          ltp_lecture: number | null
          ltp_practical: number | null
          ltp_tutorial: number | null
          max_students: number
          prerequisites: string | null
          semester: string
          subject_category: string | null
          theory_credits: number | null
          title: string
        }
        Insert: {
          code: string
          contact_hours?: number | null
          course_type?: string
          created_at?: string
          credits?: number
          department_id?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          lab_credits?: number | null
          ltp_lecture?: number | null
          ltp_practical?: number | null
          ltp_tutorial?: number | null
          max_students?: number
          prerequisites?: string | null
          semester?: string
          subject_category?: string | null
          theory_credits?: number | null
          title: string
        }
        Update: {
          code?: string
          contact_hours?: number | null
          course_type?: string
          created_at?: string
          credits?: number
          department_id?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          lab_credits?: number | null
          ltp_lecture?: number | null
          ltp_practical?: number | null
          ltp_tutorial?: number | null
          max_students?: number
          prerequisites?: string | null
          semester?: string
          subject_category?: string | null
          theory_credits?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_subjects: {
        Row: {
          course_id: string
          created_at: string
          credits: number | null
          elective_group_id: string | null
          id: string
          is_elective: boolean
          ltp_lecture: number | null
          ltp_practical: number | null
          ltp_tutorial: number | null
          program_id: string
          regulation_id: string | null
          semester_number: number
          subject_category: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          credits?: number | null
          elective_group_id?: string | null
          id?: string
          is_elective?: boolean
          ltp_lecture?: number | null
          ltp_practical?: number | null
          ltp_tutorial?: number | null
          program_id: string
          regulation_id?: string | null
          semester_number?: number
          subject_category?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          credits?: number | null
          elective_group_id?: string | null
          id?: string
          is_elective?: boolean
          ltp_lecture?: number | null
          ltp_practical?: number | null
          ltp_tutorial?: number | null
          program_id?: string
          regulation_id?: string | null
          semester_number?: number
          subject_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_subjects_elective_group_id_fkey"
            columns: ["elective_group_id"]
            isOneToOne: false
            referencedRelation: "elective_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_subjects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_subjects_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          entity_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          entity_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          entity_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          created_by: string | null
          default_value: string | null
          entity_type: string
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          placeholder: string | null
          section_group: string | null
          sort_order: number
          validation_regex: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_value?: string | null
          entity_type: string
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          placeholder?: string | null
          section_group?: string | null
          sort_order?: number
          validation_regex?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_value?: string | null
          entity_type?: string
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          placeholder?: string | null
          section_group?: string | null
          sort_order?: number
          validation_regex?: string | null
        }
        Relationships: []
      }
      deduction_types: {
        Row: {
          created_at: string
          default_value: number
          id: string
          is_percentage: boolean
          name: string
        }
        Insert: {
          created_at?: string
          default_value?: number
          id?: string
          is_percentage?: boolean
          name: string
        }
        Update: {
          created_at?: string
          default_value?: number
          id?: string
          is_percentage?: boolean
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          building: string | null
          code: string
          created_at: string
          email: string | null
          hod_id: string | null
          id: string
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          building?: string | null
          code: string
          created_at?: string
          email?: string | null
          hod_id?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          building?: string | null
          code?: string
          created_at?: string
          email?: string | null
          hod_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_hod_id_fkey"
            columns: ["hod_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_group_courses: {
        Row: {
          course_id: string
          created_at: string
          elective_group_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          elective_group_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          elective_group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_group_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_group_courses_elective_group_id_fkey"
            columns: ["elective_group_id"]
            isOneToOne: false
            referencedRelation: "elective_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_groups: {
        Row: {
          created_at: string
          group_type: string
          id: string
          max_select: number
          min_select: number
          name: string
          program_id: string | null
          regulation_id: string | null
          semester_number: number
        }
        Insert: {
          created_at?: string
          group_type?: string
          id?: string
          max_select?: number
          min_select?: number
          name: string
          program_id?: string | null
          regulation_id?: string | null
          semester_number?: number
        }
        Update: {
          created_at?: string
          group_type?: string
          id?: string
          max_select?: number
          min_select?: number
          name?: string
          program_id?: string | null
          regulation_id?: string | null
          semester_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "elective_groups_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_groups_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          semester: string
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          semester?: string
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          semester?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_duties: {
        Row: {
          assigned_by: string | null
          created_at: string
          description: string | null
          duty_type: string
          end_date: string | null
          faculty_id: string
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          start_date: string | null
          status: string
          title: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          description?: string | null
          duty_type: string
          end_date?: string | null
          faculty_id: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          start_date?: string | null
          status?: string
          title: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          description?: string | null
          duty_type?: string
          end_date?: string | null
          faculty_id?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          start_date?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_duties_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_duties_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_workload_assignments: {
        Row: {
          academic_year_id: string | null
          assigned_by: string | null
          course_id: string
          created_at: string
          faculty_id: string
          hours_per_week: number
          id: string
          max_hours_per_week: number | null
          section_id: string | null
          semester: string
          status: string
        }
        Insert: {
          academic_year_id?: string | null
          assigned_by?: string | null
          course_id: string
          created_at?: string
          faculty_id: string
          hours_per_week?: number
          id?: string
          max_hours_per_week?: number | null
          section_id?: string | null
          semester?: string
          status?: string
        }
        Update: {
          academic_year_id?: string | null
          assigned_by?: string | null
          course_id?: string
          created_at?: string
          faculty_id?: string
          hours_per_week?: number
          id?: string
          max_hours_per_week?: number | null
          section_id?: string | null
          semester?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_workload_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_workload_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_workload_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_workload_assignments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_workload_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          created_at: string
          description: string | null
          id: string
          other_fees: number
          program_id: string | null
          semester: string
          tuition_amount: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          other_fees?: number
          program_id?: string | null
          semester: string
          tuition_amount?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          other_fees?: number
          program_id?: string | null
          semester?: string
          tuition_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          enrollment_id: string
          grade_points: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          letter_grade: string | null
          numeric_grade: number | null
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          grade_points?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          letter_grade?: string | null
          numeric_grade?: number | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          grade_points?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          letter_grade?: string | null
          numeric_grade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          accreditation: string | null
          address: string | null
          affiliation: string | null
          created_at: string
          email: string | null
          id: string
          license_number: string | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accreditation?: string | null
          address?: string | null
          affiliation?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accreditation?: string | null
          address?: string | null
          affiliation?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          paid_amount: number
          semester: string
          status: string
          student_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          paid_amount?: number
          semester: string
          status?: string
          student_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          paid_amount?: number
          semester?: string
          status?: string
          student_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          days: number
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          staff_id: string
          start_date: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          days?: number
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          days?: number
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string
          id: string
          max_days_per_year: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_days_per_year?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          max_days_per_year?: number
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          paid_at: string
          payment_method: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          paid_at?: string
          payment_method?: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          paid_at?: string
          payment_method?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: number
          status: string
          total_gross: number
          total_net: number
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          status?: string
          total_gross?: number
          total_net?: number
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          status?: string
          total_gross?: number
          total_net?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          base_salary: number
          created_at: string
          gross_salary: number
          id: string
          net_salary: number
          payroll_run_id: string
          staff_id: string
          tax_amount: number
          total_allowances: number
          total_deductions: number
        }
        Insert: {
          base_salary?: number
          created_at?: string
          gross_salary?: number
          id?: string
          net_salary?: number
          payroll_run_id: string
          staff_id: string
          tax_amount?: number
          total_allowances?: number
          total_deductions?: number
        }
        Update: {
          base_salary?: number
          created_at?: string
          gross_salary?: number
          id?: string
          net_salary?: number
          payroll_run_id?: string
          staff_id?: string
          tax_amount?: number
          total_allowances?: number
          total_deductions?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhar_number: string | null
          admission_date: string | null
          admission_number: string | null
          admission_quota: string | null
          admission_type: string | null
          avatar_url: string | null
          backlogs: number | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          batch_id: string | null
          blood_group: string | null
          category: string | null
          communication_address: string | null
          created_at: string
          credits_earned: number | null
          date_of_birth: string | null
          date_of_joining: string | null
          department_id: string | null
          designation: string | null
          email: string
          employee_id: string | null
          employment_type: string | null
          experience_years: number | null
          father_mobile: string | null
          father_name: string | null
          fee_category: string | null
          full_name: string
          gender: string | null
          guardian_mobile: string | null
          guardian_name: string | null
          hostel_allocation: string | null
          id: string
          id_card_generated: boolean | null
          library_card_number: string | null
          mentor_id: string | null
          mother_mobile: string | null
          mother_name: string | null
          pan_number: string | null
          permanent_address: string | null
          phone: string | null
          previous_education: string | null
          professional_memberships: string | null
          program_id: string | null
          publications: string | null
          qualifications: string | null
          research_interests: string | null
          scholarship_status: string | null
          section_id: string | null
          specialization: string | null
          status: string
          student_id_number: string | null
          transport_allocation: string | null
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          aadhar_number?: string | null
          admission_date?: string | null
          admission_number?: string | null
          admission_quota?: string | null
          admission_type?: string | null
          avatar_url?: string | null
          backlogs?: number | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          batch_id?: string | null
          blood_group?: string | null
          category?: string | null
          communication_address?: string | null
          created_at?: string
          credits_earned?: number | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          department_id?: string | null
          designation?: string | null
          email: string
          employee_id?: string | null
          employment_type?: string | null
          experience_years?: number | null
          father_mobile?: string | null
          father_name?: string | null
          fee_category?: string | null
          full_name?: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_name?: string | null
          hostel_allocation?: string | null
          id: string
          id_card_generated?: boolean | null
          library_card_number?: string | null
          mentor_id?: string | null
          mother_mobile?: string | null
          mother_name?: string | null
          pan_number?: string | null
          permanent_address?: string | null
          phone?: string | null
          previous_education?: string | null
          professional_memberships?: string | null
          program_id?: string | null
          publications?: string | null
          qualifications?: string | null
          research_interests?: string | null
          scholarship_status?: string | null
          section_id?: string | null
          specialization?: string | null
          status?: string
          student_id_number?: string | null
          transport_allocation?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          aadhar_number?: string | null
          admission_date?: string | null
          admission_number?: string | null
          admission_quota?: string | null
          admission_type?: string | null
          avatar_url?: string | null
          backlogs?: number | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          batch_id?: string | null
          blood_group?: string | null
          category?: string | null
          communication_address?: string | null
          created_at?: string
          credits_earned?: number | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string
          employee_id?: string | null
          employment_type?: string | null
          experience_years?: number | null
          father_mobile?: string | null
          father_name?: string | null
          fee_category?: string | null
          full_name?: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_name?: string | null
          hostel_allocation?: string | null
          id?: string
          id_card_generated?: boolean | null
          library_card_number?: string | null
          mentor_id?: string | null
          mother_mobile?: string | null
          mother_name?: string | null
          pan_number?: string | null
          permanent_address?: string | null
          phone?: string | null
          previous_education?: string | null
          professional_memberships?: string | null
          program_id?: string | null
          publications?: string | null
          qualifications?: string | null
          research_interests?: string | null
          scholarship_status?: string | null
          section_id?: string | null
          specialization?: string | null
          status?: string
          student_id_number?: string | null
          transport_allocation?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          accreditation: string | null
          affiliation: string | null
          code: string
          created_at: string
          degree_type: string | null
          department_id: string
          duration_years: number
          eligibility: string | null
          id: string
          intake_capacity: number | null
          name: string
          status: string
          total_credits: number | null
        }
        Insert: {
          accreditation?: string | null
          affiliation?: string | null
          code: string
          created_at?: string
          degree_type?: string | null
          department_id: string
          duration_years?: number
          eligibility?: string | null
          id?: string
          intake_capacity?: number | null
          name: string
          status?: string
          total_credits?: number | null
        }
        Update: {
          accreditation?: string | null
          affiliation?: string | null
          code?: string
          created_at?: string
          degree_type?: string | null
          department_id?: string
          duration_years?: number
          eligibility?: string | null
          id?: string
          intake_capacity?: number | null
          name?: string
          status?: string
          total_credits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_waitlists: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_waitlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_waitlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_windows: {
        Row: {
          academic_year_id: string | null
          created_at: string
          end_date: string
          id: string
          max_credits: number | null
          min_credits: number | null
          semester_id: string | null
          start_date: string
          status: string
          window_type: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          max_credits?: number | null
          min_credits?: number | null
          semester_id?: string | null
          start_date: string
          status?: string
          window_type?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          max_credits?: number | null
          min_credits?: number | null
          semester_id?: string | null
          start_date?: string
          status?: string
          window_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_windows_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_windows_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      regulations: {
        Row: {
          code: string
          created_at: string
          description: string | null
          effective_from_year: number
          id: string
          name: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          effective_from_year?: number
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          effective_from_year?: number
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      salary_structures: {
        Row: {
          base_salary: number
          created_at: string
          designation: string
          effective_date: string
          id: string
          user_id: string
        }
        Insert: {
          base_salary?: number
          created_at?: string
          designation?: string
          effective_date?: string
          id?: string
          user_id: string
        }
        Update: {
          base_salary?: number
          created_at?: string
          designation?: string
          effective_date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      section_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          allocation_method: string
          created_at: string
          id: string
          section_id: string
          status: string
          student_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          allocation_method?: string
          created_at?: string
          id?: string
          section_id: string
          status?: string
          student_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          allocation_method?: string
          created_at?: string
          id?: string
          section_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_allocations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_allocations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          batch_id: string
          capacity: number
          classroom: string | null
          created_at: string
          id: string
          name: string
          semester: number
          status: string
          year: number
        }
        Insert: {
          batch_id: string
          capacity?: number
          classroom?: string | null
          created_at?: string
          id?: string
          name: string
          semester?: number
          status?: string
          year?: number
        }
        Update: {
          batch_id?: string
          capacity?: number
          classroom?: string | null
          created_at?: string
          id?: string
          name?: string
          semester?: number
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          semester_number: number
          start_date: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          semester_number?: number
          start_date: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          semester_number?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          student_id: string
          uploaded_at: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          student_id: string
          uploaded_at?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          student_id?: string
          uploaded_at?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_promotions: {
        Row: {
          academic_year_id: string | null
          backlogs_at_promotion: number | null
          created_at: string
          credits_at_promotion: number | null
          from_semester: number | null
          from_year: number
          id: string
          promoted_at: string
          promoted_by: string | null
          promotion_type: string
          remarks: string | null
          student_id: string
          to_semester: number | null
          to_year: number
        }
        Insert: {
          academic_year_id?: string | null
          backlogs_at_promotion?: number | null
          created_at?: string
          credits_at_promotion?: number | null
          from_semester?: number | null
          from_year: number
          id?: string
          promoted_at?: string
          promoted_by?: string | null
          promotion_type?: string
          remarks?: string | null
          student_id: string
          to_semester?: number | null
          to_year: number
        }
        Update: {
          academic_year_id?: string | null
          backlogs_at_promotion?: number | null
          created_at?: string
          credits_at_promotion?: number | null
          from_semester?: number | null
          from_year?: number
          id?: string
          promoted_at?: string
          promoted_by?: string | null
          promotion_type?: string
          remarks?: string | null
          student_id?: string
          to_semester?: number | null
          to_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_promotions_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotions_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_status_changes: {
        Row: {
          changed_by: string | null
          created_at: string
          effective_date: string
          id: string
          new_status: string
          old_status: string
          reason: string | null
          student_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          new_status: string
          old_status: string
          reason?: string | null
          student_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          new_status?: string
          old_status?: string
          reason?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_status_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_status_changes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_corequisites: {
        Row: {
          corequisite_course_id: string
          course_id: string
          created_at: string
          id: string
        }
        Insert: {
          corequisite_course_id: string
          course_id: string
          created_at?: string
          id?: string
        }
        Update: {
          corequisite_course_id?: string
          course_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_corequisites_corequisite_course_id_fkey"
            columns: ["corequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_corequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_equivalents: {
        Row: {
          course_id: string
          created_at: string
          equivalent_course_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          equivalent_course_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          equivalent_course_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_equivalents_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_equivalents_equivalent_course_id_fkey"
            columns: ["equivalent_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_prerequisites: {
        Row: {
          course_id: string
          created_at: string
          id: string
          prerequisite_course_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          prerequisite_course_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          prerequisite_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_break: boolean | null
          name: string
          slot_type: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          is_break?: boolean | null
          name: string
          slot_type?: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_break?: boolean | null
          name?: string
          slot_type?: string
          start_time?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          academic_year_id: string | null
          course_id: string
          created_at: string
          day_of_week: number
          effective_from: string | null
          effective_to: string | null
          entry_type: string
          faculty_id: string | null
          id: string
          is_substitute: boolean | null
          original_faculty_id: string | null
          room: string | null
          section_id: string | null
          status: string
          time_slot_id: string | null
          version: number | null
        }
        Insert: {
          academic_year_id?: string | null
          course_id: string
          created_at?: string
          day_of_week: number
          effective_from?: string | null
          effective_to?: string | null
          entry_type?: string
          faculty_id?: string | null
          id?: string
          is_substitute?: boolean | null
          original_faculty_id?: string | null
          room?: string | null
          section_id?: string | null
          status?: string
          time_slot_id?: string | null
          version?: number | null
        }
        Update: {
          academic_year_id?: string | null
          course_id?: string
          created_at?: string
          day_of_week?: number
          effective_from?: string | null
          effective_to?: string | null
          entry_type?: string
          faculty_id?: string | null
          id?: string
          is_substitute?: boolean | null
          original_faculty_id?: string | null
          room?: string | null
          section_id?: string | null
          status?: string
          time_slot_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_original_faculty_id_fkey"
            columns: ["original_faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_admission_number: {
        Args: { year_prefix?: string }
        Returns: string
      }
      generate_employee_id: { Args: { prefix?: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "faculty" | "student" | "hod"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "faculty", "student", "hod"],
    },
  },
} as const
