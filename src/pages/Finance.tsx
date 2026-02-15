import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, CreditCard, Settings, Users, Percent, Award, FileText } from "lucide-react";

export default function Finance() {
  const { role, user } = useAuth();
  const { toast } = useToast();

  // Fee Structures
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [feeProgram, setFeeProgram] = useState("");
  const [feeSemester, setFeeSemester] = useState("Fall 2026");
  const [feeTuition, setFeeTuition] = useState("");
  const [feeOther, setFeeOther] = useState("0");

  // Invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invStudent, setInvStudent] = useState("");
  const [invSemester, setInvSemester] = useState("Fall 2026");
  const [invAmount, setInvAmount] = useState("");
  const [invDueDate, setInvDueDate] = useState("");

  // Payments
  const [payments, setPayments] = useState<any[]>([]);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [payTransactionId, setPayTransactionId] = useState("");
  const [payBankName, setPayBankName] = useState("");
  const [payChequeNumber, setPayChequeNumber] = useState("");
  const [payChequeDate, setPayChequeDate] = useState("");
  const [payUpiId, setPayUpiId] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [trackStudentFilter, setTrackStudentFilter] = useState("");
  const [lateFeeDialogOpen, setLateFeeDialogOpen] = useState(false);
  const [lateFeeInvoice, setLateFeeInvoice] = useState("");
  const [lateFeeAmount, setLateFeeAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genSemester, setGenSemester] = useState("Fall 2026");
  const [genDialogOpen, setGenDialogOpen] = useState(false);

  // New fee management
  const [feeDefs, setFeeDefs] = useState<any[]>([]);
  const [feeComponents, setFeeComponents] = useState<any[]>([]);
  const [componentTypes, setComponentTypes] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [admissionCategories, setAdmissionCategories] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [feeDefDialogOpen, setFeeDefDialogOpen] = useState(false);
  const [concessions, setConcessions] = useState<any[]>([]);
  const [concessionDialogOpen, setConcessionDialogOpen] = useState(false);
  const [feeDefForm, setFeeDefForm] = useState({ name: "", academic_year_id: "", batch_id: "", program_id: "", department_id: "", admission_category_id: "", year_of_study: "", semester_id: "", semester_text: "", tuition: "0", lab: "0", library: "0", development: "0", sports: "0", exam: "0", miscellaneous: "0", admission: "0", caution_deposit: "0" });
  const [concessionForm, setConcessionForm] = useState({ student_id: "", fee_structure_id: "", concession_type: "scholarship", amount: "", percent: "", description: "", valid_from: "", valid_until: "" });

  // Scholarship Management
  const [scholarshipSchemes, setScholarshipSchemes] = useState<any[]>([]);
  const [scholarshipApplications, setScholarshipApplications] = useState<any[]>([]);
  const [reimbursementClaims, setReimbursementClaims] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [schemeDialogOpen, setSchemeDialogOpen] = useState(false);
  const [scholarshipAppDialogOpen, setScholarshipAppDialogOpen] = useState(false);
  const [reviewScholarshipDialogOpen, setReviewScholarshipDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [disbursementDialogOpen, setDisbursementDialogOpen] = useState(false);
  const [schemeForm, setSchemeForm] = useState({ code: "", name: "", scheme_type: "merit", fee_reimbursement: false, max_amount: "", max_percent: "", description: "" });
  const [scholarshipAppForm, setScholarshipAppForm] = useState({ scheme_id: "", academic_year_id: "", semester_text: "" });
  const [reviewScholarshipForm, setReviewScholarshipForm] = useState({ app_id: "", status: "approved", amount: "", percent: "", remarks: "" });
  const [claimForm, setClaimForm] = useState({ app_id: "", invoice_id: "", claim_amount: "", remarks: "" });
  const [disbursementForm, setDisbursementForm] = useState({ app_id: "", claim_id: "", disbursement_type: "fee_reduction", amount: "", disbursement_ref: "", payment_ref: "" });

  // Fee Concession / Waiver (student application)
  const [concessionApplications, setConcessionApplications] = useState<any[]>([]);
  const [concessionAppDialogOpen, setConcessionAppDialogOpen] = useState(false);
  const [reviewConcessionDialogOpen, setReviewConcessionDialogOpen] = useState(false);
  const [rejectConcessionDialogOpen, setRejectConcessionDialogOpen] = useState(false);
  const [concessionAppForm, setConcessionAppForm] = useState({ concession_type: "concession", amount: "", percent: "", full_waiver: false, fee_structure_id: "", semester_text: "", description: "" });
  const [reviewConcessionForm, setReviewConcessionForm] = useState({ app_id: "", remarks: "" });

  const fetchData = async () => {
    setLoading(true);
    const [feesRes, progsRes, invoicesRes, feeDefsRes, compTypesRes, yearsRes, batchRes, deptRes, admCatRes, semRes, concRes, schemesRes, scholarAppsRes, concessionAppsRes] = await Promise.all([
      supabase.from("fee_structures").select("*").order("semester"),
      supabase.from("programs").select("*"),
      role === "admin"
        ? supabase.from("invoices").select("*").order("created_at", { ascending: false })
        : supabase.from("invoices").select("*").eq("student_id", user?.id || "").order("created_at", { ascending: false }),
      supabase.from("fee_structure_definitions" as any).select("*, academic_years(name), programs(name), batches(name), departments(name), admission_categories(name), semesters(name)").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("fee_component_types" as any).select("*").order("sort_order"),
      supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
      supabase.from("batches" as any).select("*").order("admission_year", { ascending: false }),
      supabase.from("departments").select("*"),
      supabase.from("admission_categories" as any).select("*"),
      supabase.from("semesters" as any).select("*").order("semester_number"),
      role === "admin" ? supabase.from("fee_concessions" as any).select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("scholarship_schemes" as any).select("*").eq("is_active", true).order("name"),
    role === "admin"
      ? supabase.from("scholarship_applications" as any).select("*, scholarship_schemes(name, scheme_type, fee_reimbursement), academic_years(name)").order("created_at", { ascending: false })
      : supabase.from("scholarship_applications" as any).select("*, scholarship_schemes(name, scheme_type, fee_reimbursement), academic_years(name)").eq("student_id", user?.id || "").order("created_at", { ascending: false }),
    role === "admin"
      ? supabase.from("fee_concession_applications" as any).select("*, fee_structure_definitions(name), academic_years(name)").order("created_at", { ascending: false })
      : supabase.from("fee_concession_applications" as any).select("*, fee_structure_definitions(name), academic_years(name)").eq("student_id", user?.id || "").order("created_at", { ascending: false }),
    ]);
    setFeeStructures(feesRes.data || []);
    setPrograms(progsRes.data || []);
    setInvoices(invoicesRes.data || []);
    setFeeDefs((feeDefsRes.data as any[]) || []);
    setComponentTypes((compTypesRes.data as any[]) || []);
    setAcademicYears((yearsRes.data as any[]) || []);
    setBatches((batchRes.data as any[]) || []);
    setDepartments(deptRes.data || []);
    setAdmissionCategories((admCatRes.data as any[]) || []);
    setSemesters((semRes.data as any[]) || []);
    setConcessions((concRes.data as any[]) || []);
    setScholarshipSchemes((schemesRes.data as any[]) || []);
    setScholarshipApplications((scholarAppsRes.data as any[]) || []);
    setConcessionApplications((concessionAppsRes.data as any[]) || []);

    if (role === "admin") {
      const [studentsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, program_id"),
        supabase.from("user_roles").select("user_id").eq("role", "student"),
      ]);
      const studentIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
      setStudents((studentsRes.data || []).filter((s: any) => studentIds.has(s.id)));
    }

    // Fetch payments for all visible invoices
    const invoiceIds = (invoicesRes.data || []).map((i: any) => i.id);
    if (invoiceIds.length > 0) {
      const { data } = await supabase.from("payments").select("*").in("invoice_id", invoiceIds).order("paid_at", { ascending: false });
      setPayments(data || []);
    }
    if ((feeDefsRes.data as any[])?.length) {
      const fids = (feeDefsRes.data as any[]).map((f: any) => f.id);
      const { data: comps } = await supabase.from("fee_structure_components" as any).select("*, fee_component_types(code, name)").in("fee_structure_id", fids);
      setFeeComponents((comps as any[]) || []);
    }
    if (role === "admin") {
      const [claimsRes, disbRes] = await Promise.all([
        supabase.from("scholarship_reimbursement_claims" as any).select("*").order("claimed_at", { ascending: false }),
        supabase.from("scholarship_disbursements" as any).select("*").order("disbursed_at", { ascending: false }),
      ]);
      setReimbursementClaims((claimsRes.data as any[]) || []);
      setDisbursements((disbRes.data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [role, user]);

  const handleCreateFee = async () => {
    const { error } = await supabase.from("fee_structures").insert({
      program_id: feeProgram || null, semester: feeSemester, tuition_amount: parseFloat(feeTuition), other_fees: parseFloat(feeOther),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Fee structure created" }); setFeeDialogOpen(false); fetchData();
  };

  const handleCreateInvoice = async () => {
    const { error } = await supabase.from("invoices").insert({
      student_id: invStudent, semester: invSemester, total_amount: parseFloat(invAmount), due_date: invDueDate || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invoice created" }); setInvoiceDialogOpen(false); fetchData();
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const { data: payId, error } = await supabase.rpc("record_payment" as any, {
      p_invoice_id: payInvoice,
      p_amount: amount,
      p_payment_method: payMethod,
      p_transaction_id: payTransactionId || null,
      p_reference_number: payRef || null,
      p_bank_name: payBankName || null,
      p_cheque_dd_number: payChequeNumber || null,
      p_cheque_dd_date: payChequeDate || null,
      p_upi_transaction_id: payUpiId || null,
      p_remarks: payRemarks || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment recorded", description: "Receipt generated. Balance updated." });
    setPayDialogOpen(false);
    setPayAmount(""); setPayRef(""); setPayTransactionId(""); setPayBankName(""); setPayChequeNumber(""); setPayChequeDate(""); setPayUpiId(""); setPayRemarks("");
    fetchData();
  };

  const handleAddLateFee = async () => {
    const amt = parseFloat(lateFeeAmount);
    if (!lateFeeInvoice || !amt || amt <= 0) { toast({ title: "Invalid", variant: "destructive" }); return; }
    const { error } = await supabase.rpc("add_late_fee" as any, { p_invoice_id: lateFeeInvoice, p_late_fee_amount: amt });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Late fee added" });
    setLateFeeDialogOpen(false);
    setLateFeeInvoice("");
    setLateFeeAmount("");
    fetchData();
  };

  const handleCreateFeeDef = async () => {
    const amounts = [parseFloat(feeDefForm.tuition) || 0, parseFloat(feeDefForm.lab) || 0, parseFloat(feeDefForm.library) || 0, parseFloat(feeDefForm.development) || 0, parseFloat(feeDefForm.sports) || 0, parseFloat(feeDefForm.exam) || 0, parseFloat(feeDefForm.miscellaneous) || 0, parseFloat(feeDefForm.admission) || 0, parseFloat(feeDefForm.caution_deposit) || 0];
    const total = amounts.reduce((a, b) => a + b, 0);
    const { data: inserted, error } = await supabase.from("fee_structure_definitions" as any).insert({
      name: feeDefForm.name || "Fee Structure",
      academic_year_id: feeDefForm.academic_year_id || null,
      batch_id: feeDefForm.batch_id || null,
      program_id: feeDefForm.program_id || null,
      department_id: feeDefForm.department_id || null,
      admission_category_id: feeDefForm.admission_category_id || null,
      year_of_study: feeDefForm.year_of_study ? parseInt(feeDefForm.year_of_study) : null,
      semester_id: feeDefForm.semester_id || null,
      semester_text: feeDefForm.semester_text || null,
      total_amount: total,
    }).select("id").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const compCodes = ["tuition", "lab", "library", "development", "sports", "exam", "miscellaneous", "admission", "caution_deposit"];
    for (let i = 0; i < compCodes.length; i++) {
      if (amounts[i] <= 0) continue;
      const ct = componentTypes.find((t: any) => t.code === compCodes[i]);
      if (ct) await supabase.from("fee_structure_components" as any).insert({ fee_structure_id: (inserted as any).id, component_type_id: ct.id, amount: amounts[i] });
    }
    toast({ title: "Fee structure created" });
    setFeeDefDialogOpen(false);
    setFeeDefForm({ name: "", academic_year_id: "", batch_id: "", program_id: "", department_id: "", admission_category_id: "", year_of_study: "", semester_id: "", semester_text: "", tuition: "0", lab: "0", library: "0", development: "0", sports: "0", exam: "0", miscellaneous: "0", admission: "0", caution_deposit: "0" });
    fetchData();
  };

  const handleCreateConcession = async () => {
    const { error } = await supabase.from("fee_concessions" as any).insert({
      student_id: concessionForm.student_id,
      fee_structure_id: concessionForm.fee_structure_id || null,
      concession_type: concessionForm.concession_type,
      amount: concessionForm.amount ? parseFloat(concessionForm.amount) : null,
      percent: concessionForm.percent ? parseFloat(concessionForm.percent) : null,
      description: concessionForm.description || null,
      valid_from: concessionForm.valid_from || null,
      valid_until: concessionForm.valid_until || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Concession added" });
    setConcessionDialogOpen(false);
    setConcessionForm({ student_id: "", fee_structure_id: "", concession_type: "scholarship", amount: "", percent: "", description: "", valid_from: "", valid_until: "" });
    fetchData();
  };

  const handleCreateScheme = async () => {
    const { error } = await supabase.from("scholarship_schemes" as any).insert({
      code: schemeForm.code || schemeForm.name?.toLowerCase().replace(/\s+/g, "-"),
      name: schemeForm.name,
      scheme_type: schemeForm.scheme_type,
      fee_reimbursement: schemeForm.fee_reimbursement,
      max_amount: schemeForm.max_amount ? parseFloat(schemeForm.max_amount) : null,
      max_percent: schemeForm.max_percent ? parseFloat(schemeForm.max_percent) : null,
      description: schemeForm.description || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Scholarship scheme created" }); setSchemeDialogOpen(false); setSchemeForm({ code: "", name: "", scheme_type: "merit", fee_reimbursement: false, max_amount: "", max_percent: "", description: "" }); fetchData();
  };

  const handleCreateScholarshipApp = async () => {
    const { error } = await supabase.from("scholarship_applications" as any).insert({
      student_id: user?.id, scheme_id: scholarshipAppForm.scheme_id, academic_year_id: scholarshipAppForm.academic_year_id || null, semester_text: scholarshipAppForm.semester_text || null, status: "draft",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Application created" }); setScholarshipAppDialogOpen(false); setScholarshipAppForm({ scheme_id: "", academic_year_id: "", semester_text: "" }); fetchData();
  };

  const handleSubmitScholarshipApp = async (appId: string) => {
    const { error } = await supabase.rpc("submit_scholarship_application" as any, { p_app_id: appId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Application submitted" }); fetchData();
  };

  const handleReviewScholarshipApp = async () => {
    const { error } = await supabase.rpc("review_scholarship_application" as any, {
      p_app_id: reviewScholarshipForm.app_id, p_status: reviewScholarshipForm.status,
      p_amount: reviewScholarshipForm.amount ? parseFloat(reviewScholarshipForm.amount) : null,
      p_percent: reviewScholarshipForm.percent ? parseFloat(reviewScholarshipForm.percent) : null,
      p_remarks: reviewScholarshipForm.remarks || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: reviewScholarshipForm.status === "approved" ? "Application approved" : "Application updated" }); setReviewScholarshipDialogOpen(false); setReviewScholarshipForm({ app_id: "", status: "approved", amount: "", percent: "", remarks: "" }); fetchData();
  };

  const handleCreateConcessionApp = async () => {
    const { error } = await supabase.from("fee_concession_applications" as any).insert({
      student_id: user?.id, concession_type: concessionAppForm.concession_type, amount: concessionAppForm.amount ? parseFloat(concessionAppForm.amount) : null, percent: concessionAppForm.percent ? parseFloat(concessionAppForm.percent) : null, full_waiver: concessionAppForm.full_waiver, fee_structure_id: concessionAppForm.fee_structure_id || null, semester_text: concessionAppForm.semester_text || null, description: concessionAppForm.description || null, status: "draft",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Application created" }); setConcessionAppDialogOpen(false); setConcessionAppForm({ concession_type: "concession", amount: "", percent: "", full_waiver: false, fee_structure_id: "", semester_text: "", description: "" }); fetchData();
  };

  const handleSubmitConcessionApp = async (appId: string) => {
    const { error } = await supabase.rpc("submit_concession_application" as any, { p_app_id: appId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Application submitted" }); fetchData();
  };

  const handleApproveConcessionApp = async () => {
    const { error } = await supabase.rpc("approve_concession_application" as any, { p_app_id: reviewConcessionForm.app_id, p_remarks: reviewConcessionForm.remarks || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Concession approved" }); setReviewConcessionDialogOpen(false); setReviewConcessionForm({ app_id: "", remarks: "" }); fetchData();
  };

  const handleRejectConcessionApp = async () => {
    const { error } = await supabase.rpc("reject_concession_application" as any, { p_app_id: reviewConcessionForm.app_id, p_remarks: reviewConcessionForm.remarks || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Application rejected" }); setRejectConcessionDialogOpen(false); setReviewConcessionForm({ app_id: "", remarks: "" }); fetchData();
  };

  const handleCreateReimbursementClaim = async () => {
    const { error } = await supabase.from("scholarship_reimbursement_claims" as any).insert({
      scholarship_application_id: claimForm.app_id, invoice_id: claimForm.invoice_id || null, claim_amount: parseFloat(claimForm.claim_amount), status: "pending", remarks: claimForm.remarks || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Reimbursement claim created" }); setClaimDialogOpen(false); setClaimForm({ app_id: "", invoice_id: "", claim_amount: "", remarks: "" }); fetchData();
  };

  const handleRecordDisbursement = async () => {
    const { error } = await supabase.from("scholarship_disbursements" as any).insert({
      scholarship_application_id: disbursementForm.app_id, reimbursement_claim_id: disbursementForm.claim_id || null, disbursement_type: disbursementForm.disbursement_type, amount: parseFloat(disbursementForm.amount), disbursement_ref: disbursementForm.disbursement_ref || null, payment_ref: disbursementForm.payment_ref || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Disbursement recorded" }); setDisbursementDialogOpen(false); setDisbursementForm({ app_id: "", claim_id: "", disbursement_type: "fee_reduction", amount: "", disbursement_ref: "", payment_ref: "" }); fetchData();
  };

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      // Get fee structures for this semester
      const semesterFees = feeStructures.filter((f) => f.semester === genSemester);
      const semesterFeeDefs = feeDefs.filter((f: any) => (f.semester_text === genSemester || f.semesters?.name === genSemester));
      if (semesterFees.length === 0 && semesterFeeDefs.length === 0) {
        toast({ title: "No fee structures", description: `No fee structures defined for ${genSemester}`, variant: "destructive" });
        setGenerating(false);
        return;
      }

      // Get existing invoices for this semester to avoid duplicates
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("student_id")
        .eq("semester", genSemester);
      const existingStudentIds = new Set((existingInvoices || []).map((i: any) => i.student_id));

      // Match students to fee structures by program_id
      const newInvoices: any[] = [];
      let assignedFromDefs = 0;
      for (const student of students) {
        if (existingStudentIds.has(student.id)) continue;
        const feeDef = semesterFeeDefs.find((f: any) =>
          (!f.program_id || f.program_id === student.program_id) &&
          (!f.batch_id || f.batch_id === student.batch_id) &&
          (!f.admission_category_id || f.admission_category_id === student.admission_category_id)
        );
        if (feeDef) {
          const { data: invId, error } = await supabase.rpc("assign_fee_to_student" as any, { p_student_id: student.id, p_semester: genSemester });
          if (!error && invId) assignedFromDefs++;
          continue;
        }
        const fee = semesterFees.find((f: any) => f.program_id === student.program_id) || semesterFees.find((f: any) => !f.program_id);
        if (!fee) continue;
        const total = parseFloat(fee.tuition_amount) + parseFloat(fee.other_fees);
        newInvoices.push({
          student_id: student.id,
          semester: genSemester,
          total_amount: total,
          due_date: null,
        });
      }

      if (newInvoices.length === 0 && assignedFromDefs === 0) {
        toast({ title: "No new invoices", description: "All students already have invoices for this semester" });
        setGenerating(false);
        setGenDialogOpen(false);
        return;
      }

      if (newInvoices.length > 0) {
        const { error } = await supabase.from("invoices").insert(newInvoices);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
        else { toast({ title: "Invoices generated", description: `${newInvoices.length} from fee structures${assignedFromDefs ? `, ${assignedFromDefs} from fee definitions` : ""}` }); }
      } else if (assignedFromDefs > 0) {
        toast({ title: "Invoices generated", description: `${assignedFromDefs} from fee definitions` });
      }
      setGenDialogOpen(false);
      fetchData();
    } finally {
      setGenerating(false);
    }
  };

  const getProgName = (id: string | null) => programs.find((p) => p.id === id)?.name || "All Programs";
  const getStudentName = (id: string) => students.find((s) => s.id === id)?.full_name || "—";

  const statusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "partial": return "secondary";
      case "overdue": return "destructive";
      default: return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground">{role === "admin" ? "Manage fees, invoices, and payments" : "View your financial records"}</p>
        </div>

        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="payment-tracking">Payment Tracking</TabsTrigger>
            {role === "admin" && <TabsTrigger value="fee-structures">Fee Structures</TabsTrigger>}
            {role === "admin" && <TabsTrigger value="fee-definition">Fee Definition</TabsTrigger>}
            {role === "admin" && <TabsTrigger value="fee-assignment">Fee Assignment</TabsTrigger>}
            {role === "admin" && <TabsTrigger value="concessions">Concessions</TabsTrigger>}
            <TabsTrigger value="scholarships"><Award className="h-4 w-4 mr-1" />Scholarships</TabsTrigger>
            <TabsTrigger value="fee-concession"><FileText className="h-4 w-4 mr-1" />Fee Concession</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            {role === "admin" && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setGenSemester("Fall 2026"); setGenDialogOpen(true); }}><DollarSign className="h-4 w-4 mr-2" />Auto-Generate Invoices</Button>
                <Button onClick={() => { setInvStudent(""); setInvAmount(""); setInvDueDate(""); setInvoiceDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
              </div>
            )}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {role === "admin" && <TableHead>Student</TableHead>}
                      <TableHead>Semester</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Late Fee</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      {role === "admin" && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : invoices.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow>
                    ) : (
                      invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          {role === "admin" && <TableCell>{getStudentName(inv.student_id)}</TableCell>}
                          <TableCell>{inv.semester}</TableCell>
                          <TableCell className="font-medium">${parseFloat(inv.total_amount).toFixed(2)}</TableCell>
                          <TableCell>{parseFloat(inv.late_fee_amount || 0) > 0 ? `$${parseFloat(inv.late_fee_amount).toFixed(2)}` : "—"}</TableCell>
                          <TableCell className="text-green-600">${parseFloat(inv.paid_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-destructive font-medium">${(parseFloat(inv.total_amount) - parseFloat(inv.paid_amount)).toFixed(2)}</TableCell>
                          <TableCell>{inv.due_date || "—"}</TableCell>
                          <TableCell><Badge variant={statusColor(inv.status) as any}>{inv.status}</Badge></TableCell>
                          {role === "admin" && (
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                <Button variant="outline" size="sm" onClick={() => { setPayInvoice(inv.id); setPayAmount(""); setPayRef(""); setPayTransactionId(""); setPayBankName(""); setPayChequeNumber(""); setPayChequeDate(""); setPayUpiId(""); setPayRemarks(""); setPayMethod("cash"); setPayDialogOpen(true); }}>
                                  <CreditCard className="h-4 w-4 mr-1" />Pay
                                </Button>
                                {inv.due_date && new Date(inv.due_date) < new Date() && parseFloat(inv.paid_amount || 0) < parseFloat(inv.total_amount) && (
                                  <Button variant="ghost" size="sm" onClick={() => { setLateFeeInvoice(inv.id); setLateFeeAmount(""); setLateFeeDialogOpen(true); }}>Add Late Fee</Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <p className="text-sm text-muted-foreground">All payments with mode, transaction ID, receipt</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {role === "admin" && <TableHead>Student</TableHead>}
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments recorded</TableCell></TableRow>
                    ) : (
                      payments.map((p) => {
                        const inv = invoices.find((i) => i.id === p.invoice_id);
                        return (
                          <TableRow key={p.id}>
                            {role === "admin" && <TableCell>{getStudentName(inv?.student_id)}</TableCell>}
                            <TableCell>{new Date(p.paid_at).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium text-green-600">${parseFloat(p.amount).toFixed(2)}</TableCell>
                            <TableCell className="capitalize">{(p.payment_method || "cash").replace(/_/g, " ")}</TableCell>
                            <TableCell className="font-mono text-xs">{p.transaction_id || p.upi_transaction_id || p.reference_number || "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{p.receipt_number || "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{p.reference_number || "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Tracking</CardTitle>
                <p className="text-sm text-muted-foreground">Student-wise payment history, balance, status. Filter by student.</p>
                {role === "admin" && (
                  <div className="flex gap-2 mt-2">
                    <Select value={trackStudentFilter} onValueChange={setTrackStudentFilter}>
                      <SelectTrigger className="w-[240px]"><SelectValue placeholder="All students" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All students</SelectItem>
                        {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">Loading...</div>
                ) : (
                  <div className="divide-y">
                    {(trackStudentFilter ? invoices.filter((i) => i.student_id === trackStudentFilter) : invoices)
                      .reduce((acc: { student_id: string; invs: any[] }[], inv) => {
                        const existing = acc.find((a) => a.student_id === inv.student_id);
                        if (existing) existing.invs.push(inv);
                        else acc.push({ student_id: inv.student_id, invs: [inv] });
                        return acc;
                      }, [])
                      .map(({ student_id, invs }) => {
                        const studentInvs = invs;
                        const studentPays = payments.filter((p) => studentInvs.some((i) => i.id === p.invoice_id));
                        const totalDue = studentInvs.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
                        const totalPaid = studentInvs.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0);
                        const balance = totalDue - totalPaid;
                        return (
                          <div key={student_id} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{getStudentName(student_id)}</p>
                                <p className="text-sm text-muted-foreground">Total: ${totalDue.toFixed(2)} • Paid: ${totalPaid.toFixed(2)} • Balance: ${balance.toFixed(2)}</p>
                              </div>
                              <Badge variant={balance <= 0 ? "default" : "destructive"}>{balance <= 0 ? "Fully Paid" : "Pending"}</Badge>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Semester</TableHead>
                                  <TableHead>Total</TableHead>
                                  <TableHead>Paid</TableHead>
                                  <TableHead>Balance</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {studentInvs.map((inv) => (
                                  <TableRow key={inv.id}>
                                    <TableCell>{inv.semester}</TableCell>
                                    <TableCell>${parseFloat(inv.total_amount).toFixed(2)}</TableCell>
                                    <TableCell className="text-green-600">${parseFloat(inv.paid_amount).toFixed(2)}</TableCell>
                                    <TableCell className="font-medium">${(parseFloat(inv.total_amount) - parseFloat(inv.paid_amount)).toFixed(2)}</TableCell>
                                    <TableCell><Badge variant={statusColor(inv.status) as any}>{inv.status}</Badge></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Payment history</p>
                              {studentPays.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No payments</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Amount</TableHead>
                                      <TableHead>Mode</TableHead>
                                      <TableHead>Transaction</TableHead>
                                      <TableHead>Receipt</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {studentPays.map((p) => (
                                      <TableRow key={p.id}>
                                        <TableCell>{new Date(p.paid_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-green-600">${parseFloat(p.amount).toFixed(2)}</TableCell>
                                        <TableCell className="capitalize">{(p.payment_method || "cash").replace(/_/g, " ")}</TableCell>
                                        <TableCell className="font-mono text-xs">{p.transaction_id || p.upi_transaction_id || p.reference_number || "—"}</TableCell>
                                        <TableCell className="font-mono text-xs">{p.receipt_number || "—"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {role === "admin" && (
            <TabsContent value="fee-structures" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => { setFeeProgram(""); setFeeTuition(""); setFeeOther("0"); setFeeDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Fee Structure</Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Tuition</TableHead>
                        <TableHead>Other Fees</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeStructures.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No fee structures defined</TableCell></TableRow>
                      ) : (
                        feeStructures.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell>{getProgName(f.program_id)}</TableCell>
                            <TableCell>{f.semester}</TableCell>
                            <TableCell>${parseFloat(f.tuition_amount).toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(f.other_fees).toFixed(2)}</TableCell>
                            <TableCell className="font-medium">${(parseFloat(f.tuition_amount) + parseFloat(f.other_fees)).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {role === "admin" && (
            <TabsContent value="fee-definition" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setFeeDefDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Fee Structure</Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Fee Structure Definitions</CardTitle>
                  <p className="text-sm text-muted-foreground">Multi-dimensional: academic year, batch, programme, branch, admission category, year of study, semester. Component-wise breakdown.</p>
                </CardHeader>
                <CardContent className="p-0">
                  {feeDefs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No fee structure definitions. Create one with component breakdown.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Program</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Adm Cat</TableHead>
                          <TableHead>Semester</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeDefs.map((f: any) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.name}</TableCell>
                            <TableCell>{f.academic_years?.name || "—"}</TableCell>
                            <TableCell>{f.programs?.name || "—"}</TableCell>
                            <TableCell>{f.batches?.name || "—"}</TableCell>
                            <TableCell>{f.admission_categories?.name || "—"}</TableCell>
                            <TableCell>{f.semesters?.name || f.semester_text || "—"}</TableCell>
                            <TableCell className="font-medium">${parseFloat(f.total_amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {role === "admin" && (
            <TabsContent value="fee-assignment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Fee Assignment</CardTitle>
                  <p className="text-sm text-muted-foreground">Auto-assign based on student parameters, manual override, installment planning, fee freeze.</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => { setGenSemester("Fall 2026"); setGenDialogOpen(true); }}><DollarSign className="h-4 w-4 mr-2" />Auto-Generate Invoices</Button>
                      <p className="text-sm text-muted-foreground self-center">Generate invoices from fee structures. Students with existing invoices are skipped.</p>
                    </div>
                    {feeDefs.length > 0 && (
                      <p className="text-sm">New fee structures: {feeDefs.length}. Use Auto-Generate to assign fees. For new multi-dimensional structures, call assign_fee_to_student RPC per student.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {role === "admin" && (
            <TabsContent value="concessions" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setConcessionDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Concession</Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Scholarships & Concessions</CardTitle>
                  <p className="text-sm text-muted-foreground">Scholarship, fee waiver, discount applied to student fees.</p>
                </CardHeader>
                <CardContent className="p-0">
                  {concessions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No concessions defined</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount / %</TableHead>
                          <TableHead>Valid</TableHead>
                          <TableHead>Active</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {concessions.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell>{getStudentName(c.student_id)}</TableCell>
                            <TableCell className="capitalize">{c.concession_type}</TableCell>
                            <TableCell>{c.amount != null ? `$${c.amount}` : c.percent != null ? `${c.percent}%` : "—"}</TableCell>
                            <TableCell>{c.valid_from || "—"} to {c.valid_until || "—"}</TableCell>
                            <TableCell>{c.is_active ? "Yes" : "No"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="scholarships" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Scholarship Management</CardTitle>
                    <p className="text-sm text-muted-foreground">Government, institutional, merit, sports, need-based schemes. Application and approval workflow. Fee reimbursement tracking. Disbursement tracking.</p>
                  </div>
                  <div className="flex gap-2">
                    {role === "student" && <Button onClick={() => { setScholarshipAppForm({ scheme_id: "", academic_year_id: academicYears[0]?.id || "", semester_text: "" }); setScholarshipAppDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Apply for Scholarship</Button>}
                    {role === "admin" && <Button onClick={() => { setSchemeForm({ code: "", name: "", scheme_type: "merit", fee_reimbursement: false, max_amount: "", max_percent: "", description: "" }); setSchemeDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Scheme</Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {role === "admin" && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-2">Scholarship Schemes</h3>
                      {scholarshipSchemes.length === 0 ? <p className="text-sm text-muted-foreground">No schemes. Add one to get started.</p> : (
                        <Table>
                          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Reimbursement</TableHead><TableHead>Max</TableHead></TableRow></TableHeader>
                          <TableBody>{scholarshipSchemes.map((s: any) => (
                            <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell className="capitalize">{s.scheme_type}</TableCell><TableCell>{s.fee_reimbursement ? "Yes" : "No"}</TableCell><TableCell>{s.max_percent ? `${s.max_percent}%` : s.max_amount ? `$${s.max_amount}` : "—"}</TableCell></TableRow>
                          ))}</TableBody>
                        </Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Applications (Review)</h3>
                      {scholarshipApplications.length === 0 ? <p className="text-sm text-muted-foreground">No applications</p> : (
                        <Table>
                          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Scheme</TableHead><TableHead>Semester</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                          <TableBody>{scholarshipApplications.map((a: any) => (
                            <TableRow key={a.id}>
                              <TableCell>{getStudentName(a.student_id)}</TableCell>
                              <TableCell>{a.scholarship_schemes?.name || "—"}</TableCell>
                              <TableCell>{a.semester_text || a.academic_years?.name || "—"}</TableCell>
                              <TableCell><Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge></TableCell>
                              <TableCell>{(a.status === "submitted" || a.status === "under_review") && (
                                <Button size="sm" variant="outline" onClick={() => { setReviewScholarshipForm({ app_id: a.id, status: "approved", amount: a.amount_approved ? String(a.amount_approved) : "", percent: a.percent_approved ? String(a.percent_approved) : "", remarks: a.remarks || "" }); setReviewScholarshipDialogOpen(true); }}>Review</Button>
                              )}</TableCell>
                            </TableRow>
                          ))}</TableBody>
                        </Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Reimbursement Claims</h3>
                      <div className="flex justify-between items-center mb-2"><p className="text-sm text-muted-foreground">Fee reimbursement tracking for approved applications</p><Button size="sm" onClick={() => { setClaimForm({ app_id: scholarshipApplications.find((a: any) => a.status === "approved")?.id || "", invoice_id: "", claim_amount: "", remarks: "" }); setClaimDialogOpen(true); }}>Add Claim</Button></div>
                      {reimbursementClaims.length === 0 ? <p className="text-sm text-muted-foreground">No claims</p> : (
                        <Table><TableHeader><TableRow><TableHead>Application</TableHead><TableHead>Claim Amount</TableHead><TableHead>Status</TableHead><TableHead>Claimed</TableHead></TableRow></TableHeader>
                        <TableBody>{reimbursementClaims.map((c: any) => {
                          const app = scholarshipApplications.find((a: any) => a.id === c.scholarship_application_id);
                          return (
                          <TableRow key={c.id}><TableCell>{app?.scholarship_schemes?.name || c.scholarship_application_id?.slice(0, 8)}</TableCell><TableCell>${parseFloat(c.claim_amount).toFixed(2)}</TableCell><TableCell><Badge variant={c.status === "disbursed" ? "default" : c.status === "rejected" ? "destructive" : "secondary"}>{c.status}</Badge></TableCell><TableCell>{c.claimed_at ? new Date(c.claimed_at).toLocaleDateString() : "—"}</TableCell></TableRow>
                          );})}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Disbursements</h3>
                      <div className="flex justify-between items-center mb-2"><p className="text-sm text-muted-foreground">Fee reduction or cash reimbursement</p><Button size="sm" onClick={() => { setDisbursementForm({ app_id: scholarshipApplications.find((a: any) => a.status === "approved")?.id || "", claim_id: "", disbursement_type: "fee_reduction", amount: "", disbursement_ref: "", payment_ref: "" }); setDisbursementDialogOpen(true); }}>Record Disbursement</Button></div>
                      {disbursements.length === 0 ? <p className="text-sm text-muted-foreground">No disbursements</p> : (
                        <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Ref</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                        <TableBody>{disbursements.map((d: any) => (
                          <TableRow key={d.id}><TableCell className="capitalize">{d.disbursement_type?.replace("_", " ")}</TableCell><TableCell>${parseFloat(d.amount).toFixed(2)}</TableCell><TableCell className="font-mono text-xs">{d.disbursement_ref || d.payment_ref || "—"}</TableCell><TableCell>{new Date(d.disbursed_at).toLocaleDateString()}</TableCell></TableRow>
                        ))}</TableBody></Table>
                      )}
                    </div>
                  </>
                )}
                {role === "student" && (
                  <div>
                    <h3 className="font-semibold mb-2">My Scholarship Applications</h3>
                    {scholarshipApplications.length === 0 ? <p className="text-sm text-muted-foreground">You have no applications. Apply for a scheme above.</p> : (
                      <Table><TableHeader><TableRow><TableHead>Scheme</TableHead><TableHead>Type</TableHead><TableHead>Semester</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                      <TableBody>{scholarshipApplications.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.scholarship_schemes?.name || "—"}</TableCell>
                          <TableCell className="capitalize">{a.scholarship_schemes?.scheme_type || "—"}</TableCell>
                          <TableCell>{a.semester_text || "—"}</TableCell>
                          <TableCell><Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge></TableCell>
                          <TableCell>{a.status === "draft" && <Button size="sm" variant="outline" onClick={() => handleSubmitScholarshipApp(a.id)}>Submit</Button>}</TableCell>
                        </TableRow>
                      ))}</TableBody></Table>
                    )}
                    <div className="mt-4"><h3 className="font-semibold mb-2">Available Schemes</h3>
                    {scholarshipSchemes.length === 0 ? <p className="text-sm text-muted-foreground">No schemes available</p> : (
                      <div className="grid gap-2"><p className="text-sm text-muted-foreground">Apply using the button above. Schemes: {scholarshipSchemes.map((s: any) => s.name).join(", ")}</p></div>
                    )}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fee-concession" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Fee Concession / Waiver</CardTitle>
                    <p className="text-sm text-muted-foreground">Apply for fee concession or full waiver. Supporting documents required. Principal/Committee approval workflow.</p>
                  </div>
                  {role === "student" && <Button onClick={() => { setConcessionAppForm({ concession_type: "concession", amount: "", percent: "", full_waiver: false, fee_structure_id: "", semester_text: "", description: "" }); setConcessionAppDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Apply for Concession</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {role === "student" && (
                  <div>
                    <h3 className="font-semibold mb-2">My Applications</h3>
                    {concessionApplications.length === 0 ? <p className="text-sm text-muted-foreground">No applications. Apply above.</p> : (
                      <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount/%</TableHead><TableHead>Full Waiver</TableHead><TableHead>Semester</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                      <TableBody>{concessionApplications.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="capitalize">{a.concession_type}</TableCell>
                          <TableCell>{a.amount != null ? `$${a.amount}` : a.percent != null ? `${a.percent}%` : "—"}</TableCell>
                          <TableCell>{a.full_waiver ? "Yes" : "No"}</TableCell>
                          <TableCell>{a.semester_text || "—"}</TableCell>
                          <TableCell><Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge></TableCell>
                          <TableCell>{a.status === "draft" && <Button size="sm" variant="outline" onClick={() => handleSubmitConcessionApp(a.id)}>Submit</Button>}</TableCell>
                        </TableRow>
                      ))}</TableBody></Table>
                    )}
                  </div>
                )}
                {role === "admin" && (
                  <div>
                    <h3 className="font-semibold mb-2">Pending Applications (Principal/Committee Approval)</h3>
                    {concessionApplications.filter((a: any) => a.status === "submitted" || a.status === "under_review").length === 0 ? <p className="text-sm text-muted-foreground">No pending applications</p> : (
                      <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Amount/%</TableHead><TableHead>Full Waiver</TableHead><TableHead>Submitted</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                      <TableBody>{concessionApplications.filter((a: any) => a.status === "submitted" || a.status === "under_review").map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{getStudentName(a.student_id)}</TableCell>
                          <TableCell className="capitalize">{a.concession_type}</TableCell>
                          <TableCell>{a.amount != null ? `$${a.amount}` : a.percent != null ? `${a.percent}%` : "—"}</TableCell>
                          <TableCell>{a.full_waiver ? "Yes" : "No"}</TableCell>
                          <TableCell>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="default" onClick={() => { setReviewConcessionForm({ app_id: a.id, remarks: "" }); setReviewConcessionDialogOpen(true); }}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => { setReviewConcessionForm({ app_id: a.id, remarks: "" }); setRejectConcessionDialogOpen(true); }}>Reject</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}</TableBody></Table>
                    )}
                    <div className="mt-4"><h3 className="font-semibold mb-2">All Concession Applications</h3>
                    {concessionApplications.length === 0 ? <p className="text-sm text-muted-foreground">No applications</p> : (
                      <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Amount/%</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{concessionApplications.map((a: any) => (
                        <TableRow key={a.id}><TableCell>{getStudentName(a.student_id)}</TableCell><TableCell className="capitalize">{a.concession_type}</TableCell><TableCell>{a.amount != null ? `$${a.amount}` : a.percent != null ? `${a.percent}%` : a.full_waiver ? "100%" : "—"}</TableCell><TableCell><Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge></TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={invStudent} onValueChange={setInvStudent}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Semester</Label><Input value={invSemester} onChange={(e) => setInvSemester(e.target.value)} /></div>
              <div className="space-y-2"><Label>Total Amount</Label><Input type="number" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} placeholder="0.00" /></div>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} /></div>
            <Button onClick={handleCreateInvoice} className="w-full">Create Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Receipt generated automatically. Balance updated in real time.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Amount *</Label><Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" /></div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bank_deposit">Bank Deposit</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="dd">DD</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Transaction ID / Reference</Label><Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Optional" /></div>
            <div className="space-y-2"><Label>Bank Name</Label><Input value={payBankName} onChange={(e) => setPayBankName(e.target.value)} placeholder="For cheque/DD/bank" /></div>
            {(payMethod === "cheque" || payMethod === "dd") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Cheque/DD Number</Label><Input value={payChequeNumber} onChange={(e) => setPayChequeNumber(e.target.value)} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={payChequeDate} onChange={(e) => setPayChequeDate(e.target.value)} /></div>
              </div>
            )}
            {(payMethod === "upi" || payMethod === "wallet") && (
              <div className="space-y-2"><Label>UPI / Wallet Transaction ID</Label><Input value={payUpiId} onChange={(e) => setPayUpiId(e.target.value)} placeholder="Optional" /></div>
            )}
            <div className="space-y-2"><Label>Remarks</Label><Input value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)} placeholder="Optional" /></div>
            <Button onClick={handleRecordPayment} className="w-full">Record Payment & Generate Receipt</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={lateFeeDialogOpen} onOpenChange={setLateFeeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Late Fee</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Add late fee to overdue invoice. Total amount will be updated.</p>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Late Fee Amount ($)</Label><Input type="number" step="0.01" value={lateFeeAmount} onChange={(e) => setLateFeeAmount(e.target.value)} placeholder="0.00" /></div>
            <Button onClick={handleAddLateFee} className="w-full">Add Late Fee</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fee Structure Dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Fee Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={feeProgram} onValueChange={setFeeProgram}>
                <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
                <SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Semester</Label><Input value={feeSemester} onChange={(e) => setFeeSemester(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Tuition</Label><Input type="number" value={feeTuition} onChange={(e) => setFeeTuition(e.target.value)} placeholder="0.00" /></div>
              <div className="space-y-2"><Label>Other Fees</Label><Input type="number" value={feeOther} onChange={(e) => setFeeOther(e.target.value)} placeholder="0.00" /></div>
            </div>
            <Button onClick={handleCreateFee} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Generate Invoices Dialog */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Auto-Generate Invoices</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate invoices for all students based on fee structures. Students who already have an invoice for this semester will be skipped.</p>
            <div className="space-y-2"><Label>Semester</Label><Input value={genSemester} onChange={(e) => setGenSemester(e.target.value)} /></div>
            <Button onClick={handleGenerateInvoices} className="w-full" disabled={generating}>
              {generating ? "Generating..." : "Generate Invoices"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={feeDefDialogOpen} onOpenChange={setFeeDefDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Fee Structure Definition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={feeDefForm.name} onChange={(e) => setFeeDefForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. B.Tech Year 1 Sem 1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Academic Year</Label>
                <Select value={feeDefForm.academic_year_id} onValueChange={(v) => setFeeDefForm((p) => ({ ...p, academic_year_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{academicYears.map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Program</Label>
                <Select value={feeDefForm.program_id} onValueChange={(v) => setFeeDefForm((p) => ({ ...p, program_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Batch</Label>
                <Select value={feeDefForm.batch_id} onValueChange={(v) => setFeeDefForm((p) => ({ ...p, batch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{batches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Branch (Dept)</Label>
                <Select value={feeDefForm.department_id} onValueChange={(v) => setFeeDefForm((p) => ({ ...p, department_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Admission Category</Label>
                <Select value={feeDefForm.admission_category_id} onValueChange={(v) => setFeeDefForm((p) => ({ ...p, admission_category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{admissionCategories.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Year of Study</Label><Input type="number" min="1" value={feeDefForm.year_of_study} onChange={(e) => setFeeDefForm((p) => ({ ...p, year_of_study: e.target.value }))} placeholder="1-5" /></div>
              <div><Label>Semester</Label>
                <Select value={feeDefForm.semester_id} onValueChange={(v) => setFeeDefForm((p) => ({ ...p, semester_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{semesters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Semester (text)</Label><Input value={feeDefForm.semester_text} onChange={(e) => setFeeDefForm((p) => ({ ...p, semester_text: e.target.value }))} placeholder="e.g. Fall 2026" /></div>
            </div>
            <div>
              <Label className="mb-2 block">Component breakdown</Label>
              <div className="grid grid-cols-3 gap-2">
                {["tuition", "lab", "library", "development", "sports", "exam", "miscellaneous", "admission", "caution_deposit"].map((code) => (
                  <div key={code} className="flex items-center gap-2">
                    <Label className="capitalize w-24 text-xs">{code.replace("_", " ")}</Label>
                    <Input type="number" step="0.01" value={(feeDefForm as any)[code] || "0"} onChange={(e) => setFeeDefForm((p) => ({ ...p, [code]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleCreateFeeDef}>Create Fee Structure</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={concessionDialogOpen} onOpenChange={setConcessionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Scholarship / Concession</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Student</Label>
              <Select value={concessionForm.student_id} onValueChange={(v) => setConcessionForm((p) => ({ ...p, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Type</Label>
              <Select value={concessionForm.concession_type} onValueChange={(v) => setConcessionForm((p) => ({ ...p, concession_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="fee_waiver">Fee Waiver</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={concessionForm.amount} onChange={(e) => setConcessionForm((p) => ({ ...p, amount: e.target.value, percent: "" }))} placeholder="Fixed amount" /></div>
              <div><Label>Percent</Label><Input type="number" step="0.01" value={concessionForm.percent} onChange={(e) => setConcessionForm((p) => ({ ...p, percent: e.target.value, amount: "" }))} placeholder="Or %" /></div>
            </div>
            <div><Label>Valid From</Label><Input type="date" value={concessionForm.valid_from} onChange={(e) => setConcessionForm((p) => ({ ...p, valid_from: e.target.value }))} /></div>
            <div><Label>Valid Until</Label><Input type="date" value={concessionForm.valid_until} onChange={(e) => setConcessionForm((p) => ({ ...p, valid_until: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={concessionForm.description} onChange={(e) => setConcessionForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleCreateConcession}>Add Concession</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scholarship Scheme Dialog */}
      <Dialog open={schemeDialogOpen} onOpenChange={setSchemeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Scholarship Scheme</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={schemeForm.code} onChange={(e) => setSchemeForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. merit-top" /></div>
              <div><Label>Name</Label><Input value={schemeForm.name} onChange={(e) => setSchemeForm((p) => ({ ...p, name: e.target.value }))} placeholder="Scheme name" /></div>
            </div>
            <div><Label>Type</Label>
              <Select value={schemeForm.scheme_type} onValueChange={(v) => setSchemeForm((p) => ({ ...p, scheme_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="institutional">Institutional</SelectItem>
                  <SelectItem value="merit">Merit</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="need_based">Need-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={schemeForm.fee_reimbursement} onChange={(e) => setSchemeForm((p) => ({ ...p, fee_reimbursement: e.target.checked }))} /><Label>Fee reimbursement (student pays first, claims later)</Label></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max amount ($)</Label><Input type="number" step="0.01" value={schemeForm.max_amount} onChange={(e) => setSchemeForm((p) => ({ ...p, max_amount: e.target.value }))} placeholder="Optional" /></div>
              <div><Label>Max percent</Label><Input type="number" step="0.01" value={schemeForm.max_percent} onChange={(e) => setSchemeForm((p) => ({ ...p, max_percent: e.target.value }))} placeholder="Optional" /></div>
            </div>
            <div><Label>Description</Label><Input value={schemeForm.description} onChange={(e) => setSchemeForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleCreateScheme} className="w-full">Create Scheme</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scholarship Application Dialog (Student) */}
      <Dialog open={scholarshipAppDialogOpen} onOpenChange={setScholarshipAppDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Scholarship</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Scheme</Label>
              <Select value={scholarshipAppForm.scheme_id} onValueChange={(v) => setScholarshipAppForm((p) => ({ ...p, scheme_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select scheme" /></SelectTrigger>
                <SelectContent>{scholarshipSchemes.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.scheme_type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Academic Year</Label>
              <Select value={scholarshipAppForm.academic_year_id} onValueChange={(v) => setScholarshipAppForm((p) => ({ ...p, academic_year_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{academicYears.map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Semester</Label><Input value={scholarshipAppForm.semester_text} onChange={(e) => setScholarshipAppForm((p) => ({ ...p, semester_text: e.target.value }))} placeholder="e.g. Fall 2026" /></div>
            <Button onClick={handleCreateScholarshipApp} className="w-full">Create Application (Draft)</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Scholarship Dialog (Admin) */}
      <Dialog open={reviewScholarshipDialogOpen} onOpenChange={setReviewScholarshipDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Scholarship Application</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Status</Label>
              <Select value={reviewScholarshipForm.status} onValueChange={(v) => setReviewScholarshipForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reviewScholarshipForm.status === "approved" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount Approved ($)</Label><Input type="number" step="0.01" value={reviewScholarshipForm.amount} onChange={(e) => setReviewScholarshipForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Optional" /></div>
                <div><Label>Percent Approved</Label><Input type="number" step="0.01" value={reviewScholarshipForm.percent} onChange={(e) => setReviewScholarshipForm((p) => ({ ...p, percent: e.target.value }))} placeholder="Optional" /></div>
              </div>
            )}
            <div><Label>Remarks</Label><Input value={reviewScholarshipForm.remarks} onChange={(e) => setReviewScholarshipForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleReviewScholarshipApp} className="w-full">Submit Review</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reimbursement Claim Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Reimbursement Claim</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Approved Scholarship Application</Label>
              <Select value={claimForm.app_id} onValueChange={(v) => setClaimForm((p) => ({ ...p, app_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{scholarshipApplications.filter((a: any) => a.status === "approved").map((a: any) => <SelectItem key={a.id} value={a.id}>{a.scholarship_schemes?.name} - {getStudentName(a.student_id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Invoice (optional)</Label>
              <Select value={claimForm.invoice_id} onValueChange={(v) => setClaimForm((p) => ({ ...p, invoice_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{invoices.map((i: any) => <SelectItem key={i.id} value={i.id}>{getStudentName(i.student_id)} - {i.semester} - ${parseFloat(i.total_amount).toFixed(2)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Claim Amount ($)</Label><Input type="number" step="0.01" value={claimForm.claim_amount} onChange={(e) => setClaimForm((p) => ({ ...p, claim_amount: e.target.value }))} placeholder="0.00" /></div>
            <div><Label>Remarks</Label><Input value={claimForm.remarks} onChange={(e) => setClaimForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleCreateReimbursementClaim} className="w-full">Create Claim</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disbursement Dialog */}
      <Dialog open={disbursementDialogOpen} onOpenChange={setDisbursementDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Disbursement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Scholarship Application</Label>
              <Select value={disbursementForm.app_id} onValueChange={(v) => setDisbursementForm((p) => ({ ...p, app_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{scholarshipApplications.filter((a: any) => a.status === "approved").map((a: any) => <SelectItem key={a.id} value={a.id}>{a.scholarship_schemes?.name} - {getStudentName(a.student_id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Disbursement Type</Label>
              <Select value={disbursementForm.disbursement_type} onValueChange={(v) => setDisbursementForm((p) => ({ ...p, disbursement_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fee_reduction">Fee Reduction</SelectItem>
                  <SelectItem value="cash_reimbursement">Cash Reimbursement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={disbursementForm.amount} onChange={(e) => setDisbursementForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
            <div><Label>Disbursement Ref</Label><Input value={disbursementForm.disbursement_ref} onChange={(e) => setDisbursementForm((p) => ({ ...p, disbursement_ref: e.target.value }))} placeholder="Optional" /></div>
            <div><Label>Payment Ref</Label><Input value={disbursementForm.payment_ref} onChange={(e) => setDisbursementForm((p) => ({ ...p, payment_ref: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleRecordDisbursement} className="w-full">Record Disbursement</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Concession Application Dialog (Student) */}
      <Dialog open={concessionAppDialogOpen} onOpenChange={setConcessionAppDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Fee Concession / Waiver</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Upload supporting documents separately via student profile. Mention document details in description.</p>
          <div className="space-y-4">
            <div><Label>Type</Label>
              <Select value={concessionAppForm.concession_type} onValueChange={(v) => setConcessionAppForm((p) => ({ ...p, concession_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="concession">Concession (% or amount)</SelectItem><SelectItem value="waiver">Full Waiver</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={concessionAppForm.full_waiver} onChange={(e) => setConcessionAppForm((p) => ({ ...p, full_waiver: e.target.checked }))} /><Label>Full waiver (100%)</Label></div>
            {!concessionAppForm.full_waiver && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={concessionAppForm.amount} onChange={(e) => setConcessionAppForm((p) => ({ ...p, amount: e.target.value, percent: "" }))} placeholder="Fixed" /></div>
                <div><Label>Percent</Label><Input type="number" step="0.01" value={concessionAppForm.percent} onChange={(e) => setConcessionAppForm((p) => ({ ...p, percent: e.target.value, amount: "" }))} placeholder="Or %" /></div>
              </div>
            )}
            <div><Label>Fee Structure (optional)</Label>
              <Select value={concessionAppForm.fee_structure_id} onValueChange={(v) => setConcessionAppForm((p) => ({ ...p, fee_structure_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Apply to specific structure" /></SelectTrigger>
                <SelectContent>{feeDefs.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name} - {f.semesters?.name || f.semester_text}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Semester</Label><Input value={concessionAppForm.semester_text} onChange={(e) => setConcessionAppForm((p) => ({ ...p, semester_text: e.target.value }))} placeholder="e.g. Fall 2026" /></div>
            <div><Label>Description / Supporting docs note</Label><Input value={concessionAppForm.description} onChange={(e) => setConcessionAppForm((p) => ({ ...p, description: e.target.value }))} placeholder="Mention document types uploaded" /></div>
            <Button onClick={handleCreateConcessionApp} className="w-full">Create Application (Draft)</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Concession Dialog (Approve) */}
      <Dialog open={reviewConcessionDialogOpen} onOpenChange={setReviewConcessionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Concession Application</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Approving will create a fee concession and update fee structure for the student.</p>
          <div className="space-y-4">
            <div><Label>Remarks</Label><Input value={reviewConcessionForm.remarks} onChange={(e) => setReviewConcessionForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleApproveConcessionApp} className="w-full">Approve & Create Concession</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Concession Dialog */}
      <Dialog open={rejectConcessionDialogOpen} onOpenChange={setRejectConcessionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Concession Application</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Remarks (recommended)</Label><Input value={reviewConcessionForm.remarks} onChange={(e) => setReviewConcessionForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Reason for rejection" /></div>
            <Button variant="destructive" onClick={handleRejectConcessionApp} className="w-full">Reject Application</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
