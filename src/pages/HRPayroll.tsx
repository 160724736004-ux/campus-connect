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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, Users, Calendar, FileText } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const TAX_RATE = 0.1; // 10% flat tax for simplicity

export default function HRPayroll() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  // Data
  const [staff, setStaff] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [allowanceTypes, setAllowanceTypes] = useState<any[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [salaryDialog, setSalaryDialog] = useState(false);
  const [salUserId, setSalUserId] = useState("");
  const [salDesignation, setSalDesignation] = useState("");
  const [salBase, setSalBase] = useState("");

  const [allowDialog, setAllowDialog] = useState(false);
  const [allowName, setAllowName] = useState("");
  const [allowIsPct, setAllowIsPct] = useState(false);
  const [allowValue, setAllowValue] = useState("");

  const [deductDialog, setDeductDialog] = useState(false);
  const [deductName, setDeductName] = useState("");
  const [deductIsPct, setDeductIsPct] = useState(false);
  const [deductValue, setDeductValue] = useState("");

  const [payrollDialog, setPayrollDialog] = useState(false);
  const [prMonth, setPrMonth] = useState(new Date().getMonth() + 1);
  const [prYear, setPrYear] = useState(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);

  const [leaveTypeDialog, setLeaveTypeDialog] = useState(false);
  const [ltName, setLtName] = useState("");
  const [ltMaxDays, setLtMaxDays] = useState("15");

  const [leaveDialog, setLeaveDialog] = useState(false);
  const [lrType, setLrType] = useState("");
  const [lrStart, setLrStart] = useState("");
  const [lrEnd, setLrEnd] = useState("");
  const [lrReason, setLrReason] = useState("");

  const [payslipDialog, setPayslipDialog] = useState(false);
  const [selectedPayslips, setSelectedPayslips] = useState<any[]>([]);
  const [selectedRunLabel, setSelectedRunLabel] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [salRes, allowRes, deductRes, ltRes] = await Promise.all([
      supabase.from("salary_structures" as any).select("*"),
      supabase.from("allowance_types" as any).select("*"),
      supabase.from("deduction_types" as any).select("*"),
      supabase.from("leave_types" as any).select("*"),
    ]);

    let profilesRes: any = { data: [] }, rolesRes: any = { data: [] }, prRes: any = { data: [] }, lrRes: any = { data: [] };
    if (isAdmin) {
      [profilesRes, rolesRes, prRes, lrRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
        supabase.from("user_roles").select("user_id").in("role", ["faculty", "hod"]),
        supabase.from("payroll_runs" as any).select("*").order("created_at", { ascending: false }),
        supabase.from("leave_requests" as any).select("*").order("created_at", { ascending: false }),
      ]);
    } else {
      lrRes = await supabase.from("leave_requests" as any).select("*").eq("staff_id", user?.id || "").order("created_at", { ascending: false });
    }

    setSalaries(salRes.data || []);
    setAllowanceTypes(allowRes.data || []);
    setDeductionTypes(deductRes.data || []);
    setLeaveTypes(ltRes.data || []);
    setPayrollRuns(prRes.data || []);
    setLeaveRequests(lrRes.data || []);

    if (isAdmin) {
      const staffIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
      setStaff((profilesRes.data || []).filter((p: any) => staffIds.has(p.id)));
    }

    // Fetch payslips for the user or all
    if (!isAdmin && user?.id) {
      const { data } = await supabase.from("payslips" as any).select("*").eq("staff_id", user.id).order("created_at", { ascending: false });
      setPayslips(data || []);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [role, user]);

  const getStaffName = (id: string) => staff.find((s) => s.id === id)?.full_name || "—";
  const getLeaveTypeName = (id: string) => leaveTypes.find((l) => l.id === id)?.name || "—";

  // Handlers
  const handleAddSalary = async () => {
    const { error } = await supabase.from("salary_structures" as any).insert({
      user_id: salUserId, designation: salDesignation, base_salary: parseFloat(salBase),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Salary structure added" }); setSalaryDialog(false); fetchData();
  };

  const handleAddAllowance = async () => {
    const { error } = await supabase.from("allowance_types" as any).insert({
      name: allowName, is_percentage: allowIsPct, default_value: parseFloat(allowValue),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Allowance type added" }); setAllowDialog(false); fetchData();
  };

  const handleAddDeduction = async () => {
    const { error } = await supabase.from("deduction_types" as any).insert({
      name: deductName, is_percentage: deductIsPct, default_value: parseFloat(deductValue),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deduction type added" }); setDeductDialog(false); fetchData();
  };

  const handleAddLeaveType = async () => {
    const { error } = await supabase.from("leave_types" as any).insert({
      name: ltName, max_days_per_year: parseInt(ltMaxDays),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Leave type added" }); setLeaveTypeDialog(false); fetchData();
  };

  const handleRequestLeave = async () => {
    const start = new Date(lrStart);
    const end = new Date(lrEnd);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const { error } = await supabase.from("leave_requests" as any).insert({
      staff_id: user?.id, leave_type_id: lrType, start_date: lrStart, end_date: lrEnd, days, reason: lrReason,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Leave request submitted" }); setLeaveDialog(false); fetchData();
  };

  const handleApproveLeave = async (id: string, status: string) => {
    const { error } = await supabase.from("leave_requests" as any).update({ status, approved_by: user?.id }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Leave ${status}` }); fetchData();
  };

  const handleRunPayroll = async () => {
    setProcessing(true);
    try {
      const newSlips: any[] = [];
      let totalGross = 0, totalNet = 0;

      for (const sal of salaries) {
        const base = parseFloat(sal.base_salary);
        let totalAllow = 0;
        for (const a of allowanceTypes) {
          totalAllow += a.is_percentage ? base * (parseFloat(a.default_value) / 100) : parseFloat(a.default_value);
        }
        let totalDeduct = 0;
        for (const d of deductionTypes) {
          totalDeduct += d.is_percentage ? base * (parseFloat(d.default_value) / 100) : parseFloat(d.default_value);
        }
        const gross = base + totalAllow;
        const tax = gross * TAX_RATE;
        const net = gross - totalDeduct - tax;
        totalGross += gross;
        totalNet += net;
        newSlips.push({
          staff_id: sal.user_id, base_salary: base, total_allowances: totalAllow,
          total_deductions: totalDeduct, tax_amount: tax, gross_salary: gross, net_salary: net,
        });
      }

      if (newSlips.length === 0) {
        toast({ title: "No salary structures", description: "Add salary structures first", variant: "destructive" });
        setProcessing(false); return;
      }

      const { data: run, error: runErr } = await (supabase.from("payroll_runs" as any).insert({
        month: prMonth, year: prYear, status: "processed", total_gross: totalGross, total_net: totalNet, created_by: user?.id,
      }) as any).select().single();

      if (runErr) { toast({ title: "Error", description: runErr.message, variant: "destructive" }); setProcessing(false); return; }

      const slipsWithRun = newSlips.map((s) => ({ ...s, payroll_run_id: run.id }));
      const { error: slipErr } = await supabase.from("payslips" as any).insert(slipsWithRun);
      if (slipErr) { toast({ title: "Error", description: slipErr.message, variant: "destructive" }); setProcessing(false); return; }

      toast({ title: `Payroll processed — ${newSlips.length} payslips generated` });
      setPayrollDialog(false); fetchData();
    } finally { setProcessing(false); }
  };

  const handleViewPayslips = async (run: any) => {
    const { data } = await supabase.from("payslips" as any).select("*").eq("payroll_run_id", run.id);
    setSelectedPayslips(data || []);
    setSelectedRunLabel(`${MONTHS[run.month - 1]} ${run.year}`);
    setPayslipDialog(true);
  };

  const leaveStatusColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "outline";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR & Payroll</h1>
          <p className="text-muted-foreground">{isAdmin ? "Manage staff salaries, payroll, and leave" : "View your payroll and leave records"}</p>
        </div>

        <Tabs defaultValue={isAdmin ? "salaries" : "payslips"}>
          <TabsList>
            {isAdmin && <TabsTrigger value="salaries">Salaries</TabsTrigger>}
            {isAdmin && <TabsTrigger value="config">Allowances & Deductions</TabsTrigger>}
            {isAdmin && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
            <TabsTrigger value="payslips">Payslips</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
          </TabsList>

          {/* SALARIES TAB */}
          {isAdmin && (
            <TabsContent value="salaries" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => { setSalUserId(""); setSalDesignation(""); setSalBase(""); setSalaryDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Add Salary Structure
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Base Salary</TableHead>
                        <TableHead>Effective Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaries.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No salary structures</TableCell></TableRow>
                      ) : salaries.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{getStaffName(s.user_id)}</TableCell>
                          <TableCell>{s.designation}</TableCell>
                          <TableCell className="font-medium">${parseFloat(s.base_salary).toLocaleString()}</TableCell>
                          <TableCell>{s.effective_date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ALLOWANCES & DEDUCTIONS TAB */}
          {isAdmin && (
            <TabsContent value="config" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Allowance Types</CardTitle>
                    <Button size="sm" onClick={() => { setAllowName(""); setAllowIsPct(false); setAllowValue(""); setAllowDialog(true); }}>
                      <Plus className="h-4 w-4 mr-1" />Add
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {allowanceTypes.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">None</TableCell></TableRow>
                        ) : allowanceTypes.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.name}</TableCell>
                            <TableCell><Badge variant="outline">{a.is_percentage ? "%" : "Fixed"}</Badge></TableCell>
                            <TableCell>{a.is_percentage ? `${a.default_value}%` : `$${parseFloat(a.default_value).toLocaleString()}`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Deduction Types</CardTitle>
                    <Button size="sm" onClick={() => { setDeductName(""); setDeductIsPct(false); setDeductValue(""); setDeductDialog(true); }}>
                      <Plus className="h-4 w-4 mr-1" />Add
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {deductionTypes.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">None</TableCell></TableRow>
                        ) : deductionTypes.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{d.name}</TableCell>
                            <TableCell><Badge variant="outline">{d.is_percentage ? "%" : "Fixed"}</Badge></TableCell>
                            <TableCell>{d.is_percentage ? `${d.default_value}%` : `$${parseFloat(d.default_value).toLocaleString()}`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* PAYROLL TAB */}
          {isAdmin && (
            <TabsContent value="payroll" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => { setPrMonth(new Date().getMonth() + 1); setPrYear(new Date().getFullYear()); setPayrollDialog(true); }}>
                  <DollarSign className="h-4 w-4 mr-2" />Run Payroll
                </Button>
              </div>

              {/* Summary cards */}
              {payrollRuns.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Runs</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{payrollRuns.length}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last Gross</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">${parseFloat(payrollRuns[0]?.total_gross || 0).toLocaleString()}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last Net</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">${parseFloat(payrollRuns[0]?.total_net || 0).toLocaleString()}</div></CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Gross</TableHead>
                        <TableHead>Total Net</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRuns.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payroll runs</TableCell></TableRow>
                      ) : payrollRuns.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{MONTHS[r.month - 1]} {r.year}</TableCell>
                          <TableCell><Badge variant={r.status === "processed" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                          <TableCell>${parseFloat(r.total_gross).toLocaleString()}</TableCell>
                          <TableCell>${parseFloat(r.total_net).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleViewPayslips(r)}>
                              <FileText className="h-4 w-4 mr-1" />Payslips
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* PAYSLIPS TAB (staff view) */}
          <TabsContent value="payslips" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Staff</TableHead>}
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Net Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAdmin ? "Select a payroll run to view payslips" : "No payslips yet"}</TableCell></TableRow>
                    ) : payslips.map((p) => (
                      <TableRow key={p.id}>
                        {isAdmin && <TableCell>{getStaffName(p.staff_id)}</TableCell>}
                        <TableCell>${parseFloat(p.base_salary).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">+${parseFloat(p.total_allowances).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">${parseFloat(p.gross_salary).toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">-${parseFloat(p.total_deductions).toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">-${parseFloat(p.tax_amount).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">${parseFloat(p.net_salary).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEAVE TAB */}
          <TabsContent value="leave" className="space-y-4">
            <div className="flex justify-end gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => { setLtName(""); setLtMaxDays("15"); setLeaveTypeDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Add Leave Type
                </Button>
              )}
              {!isAdmin && (
                <Button onClick={() => { setLrType(""); setLrStart(""); setLrEnd(""); setLrReason(""); setLeaveDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Request Leave
                </Button>
              )}
            </div>

            {isAdmin && leaveTypes.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {leaveTypes.map((lt) => (
                  <Badge key={lt.id} variant="secondary">{lt.name} — {lt.max_days_per_year} days/year</Badge>
                ))}
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Staff</TableHead>}
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leave requests</TableCell></TableRow>
                    ) : leaveRequests.map((lr) => (
                      <TableRow key={lr.id}>
                        {isAdmin && <TableCell>{getStaffName(lr.staff_id)}</TableCell>}
                        <TableCell>{getLeaveTypeName(lr.leave_type_id)}</TableCell>
                        <TableCell>{lr.start_date}</TableCell>
                        <TableCell>{lr.end_date}</TableCell>
                        <TableCell>{lr.days}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{lr.reason || "—"}</TableCell>
                        <TableCell><Badge variant={leaveStatusColor(lr.status) as any}>{lr.status}</Badge></TableCell>
                        {isAdmin && (
                          <TableCell className="space-x-1">
                            {lr.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleApproveLeave(lr.id, "approved")}>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleApproveLeave(lr.id, "rejected")}>Reject</Button>
                              </>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Salary Dialog */}
      <Dialog open={salaryDialog} onOpenChange={setSalaryDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Salary Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={salUserId} onValueChange={setSalUserId}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Designation</Label><Input value={salDesignation} onChange={(e) => setSalDesignation(e.target.value)} placeholder="e.g. Professor" /></div>
              <div className="space-y-2"><Label>Base Salary</Label><Input type="number" value={salBase} onChange={(e) => setSalBase(e.target.value)} placeholder="0.00" /></div>
            </div>
            <Button onClick={handleAddSalary} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allowance Dialog */}
      <Dialog open={allowDialog} onOpenChange={setAllowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Allowance Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={allowName} onChange={(e) => setAllowName(e.target.value)} placeholder="e.g. Housing Allowance" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={allowIsPct ? "pct" : "fixed"} onValueChange={(v) => setAllowIsPct(v === "pct")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="pct">Percentage of Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Value</Label><Input type="number" value={allowValue} onChange={(e) => setAllowValue(e.target.value)} placeholder="0" /></div>
            </div>
            <Button onClick={handleAddAllowance} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deduction Dialog */}
      <Dialog open={deductDialog} onOpenChange={setDeductDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Deduction Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={deductName} onChange={(e) => setDeductName(e.target.value)} placeholder="e.g. Pension" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={deductIsPct ? "pct" : "fixed"} onValueChange={(v) => setDeductIsPct(v === "pct")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="pct">Percentage of Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Value</Label><Input type="number" value={deductValue} onChange={(e) => setDeductValue(e.target.value)} placeholder="0" /></div>
            </div>
            <Button onClick={handleAddDeduction} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Run Payroll Dialog */}
      <Dialog open={payrollDialog} onOpenChange={setPayrollDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Run Payroll</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate payslips for all staff with salary structures. Allowances, deductions, and a {TAX_RATE * 100}% tax will be applied.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(prMonth)} onValueChange={(v) => setPrMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Year</Label><Input type="number" value={prYear} onChange={(e) => setPrYear(parseInt(e.target.value))} /></div>
            </div>
            <Button onClick={handleRunPayroll} className="w-full" disabled={processing}>{processing ? "Processing..." : "Process Payroll"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Type Dialog */}
      <Dialog open={leaveTypeDialog} onOpenChange={setLeaveTypeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Leave Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={ltName} onChange={(e) => setLtName(e.target.value)} placeholder="e.g. Annual Leave" /></div>
            <div className="space-y-2"><Label>Max Days/Year</Label><Input type="number" value={ltMaxDays} onChange={(e) => setLtMaxDays(e.target.value)} /></div>
            <Button onClick={handleAddLeaveType} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Leave Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={lrType} onValueChange={setLrType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{leaveTypes.map((lt) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>From</Label><Input type="date" value={lrStart} onChange={(e) => setLrStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>To</Label><Input type="date" value={lrEnd} onChange={(e) => setLrEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Reason</Label><Textarea value={lrReason} onChange={(e) => setLrReason(e.target.value)} placeholder="Optional" /></div>
            <Button onClick={handleRequestLeave} className="w-full">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payslips Dialog */}
      <Dialog open={payslipDialog} onOpenChange={setPayslipDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Payslips — {selectedRunLabel}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedPayslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{getStaffName(p.staff_id)}</TableCell>
                  <TableCell>${parseFloat(p.base_salary).toLocaleString()}</TableCell>
                  <TableCell className="text-green-600">+${parseFloat(p.total_allowances).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">${parseFloat(p.gross_salary).toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">-${parseFloat(p.total_deductions).toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">-${parseFloat(p.tax_amount).toLocaleString()}</TableCell>
                  <TableCell className="font-bold">${parseFloat(p.net_salary).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
