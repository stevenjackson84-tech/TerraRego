import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Crown, User, Users, ShieldAlert, Trash2, Globe, Mail, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, getOrgMembers, getOrgName, getDomain, updateMemberRole, suspendMember, removeMember } from "@/lib/localAuth";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-purple-100 text-purple-800", icon: Crown },
  member: { label: "Member", color: "bg-blue-100 text-blue-800", icon: User },
};

const STATUS_CONFIG = {
  active: { label: "Active", color: "text-emerald-600" },
  suspended: { label: "Suspended", color: "text-red-500" },
};

function MemberAvatar({ name, size = "md" }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn(
      "rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0",
      size === "lg" ? "w-14 h-14 text-lg" : "w-9 h-9 text-xs"
    )}>
      {initials}
    </div>
  );
}

export default function Organization() {
  const currentUser = getSession();
  const domain = currentUser ? getDomain(currentUser.email) : null;
  const orgName = domain ? getOrgName(domain) : "Your Organization";
  const isAdmin = currentUser?.role === "admin";

  const [members, setMembers] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null); // { type, member }

  const reload = () => {
    if (domain) setMembers(getOrgMembers(domain));
  };

  useEffect(() => { reload(); }, [domain]);

  const handleRoleChange = (userId, role) => {
    updateMemberRole(userId, role);
    reload();
  };

  const handleSuspend = (member) => {
    setConfirmAction({ type: "suspend", member });
  };

  const handleRemove = (member) => {
    setConfirmAction({ type: "remove", member });
  };

  const executeAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "suspend") {
      suspendMember(confirmAction.member.id);
    } else if (confirmAction.type === "remove") {
      removeMember(confirmAction.member.id);
    }
    setConfirmAction(null);
    reload();
  };

  const adminCount = members.filter(m => m.role === "admin").length;
  const activeCount = members.filter(m => m.status === "active").length;

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Org Header */}
        <div className="bg-slate-900 rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{orgName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-400 text-sm">{domain}</span>
                </div>
                <p className="text-slate-400 text-sm mt-2">
                  All users signing up with <strong className="text-white">@{domain}</strong> automatically join this workspace
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{members.length}</p>
              <p className="text-slate-400 text-sm">Members</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative grid grid-cols-3 gap-4 mt-6">
            {[
              { label: "Total Members", value: members.length, icon: Users },
              { label: "Active", value: activeCount, icon: CheckCircle2 },
              { label: "Admins", value: adminCount, icon: Crown },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4 flex items-center gap-3">
                <stat.icon className="h-5 w-5 text-slate-300" />
                <div>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-slate-400 text-xs">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Profile Card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base">Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex items-center gap-4">
            <MemberAvatar name={currentUser.name} size="lg" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-lg">{currentUser.name}</p>
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5" />
                {currentUser.email}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {(() => {
                const cfg = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.member;
                return (
                  <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", cfg.color)}>
                    <cfg.icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                );
              })()}
              <span className="text-xs text-slate-400">
                Joined {new Date(currentUser.joinedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Collaboration Info */}
        <Card className="border-0 shadow-sm bg-blue-50 mb-6">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Domain-Based Collaboration</p>
                <p className="text-blue-700 text-sm mt-1">
                  Everyone on <strong>@{domain}</strong> shares the same workspace — deals, projects, contacts,
                  tasks, and GIS maps. Anyone who signs up with your domain is automatically added here.
                  Admins can manage roles and access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Organization Members
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Member</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  {isAdmin && (
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(member => {
                  const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
                  const statusCfg = STATUS_CONFIG[member.status] || STATUS_CONFIG.active;
                  const isSelf = member.id === currentUser.id;

                  return (
                    <tr key={member.id} className={cn("hover:bg-slate-50 transition-colors", isSelf && "bg-blue-50/40")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <MemberAvatar name={member.name} />
                          <div>
                            <p className="font-medium text-slate-900">
                              {member.name}
                              {isSelf && <span className="ml-2 text-xs text-blue-600 font-normal">(you)</span>}
                            </p>
                            <p className="text-xs text-slate-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin && !isSelf ? (
                          <Select value={member.role} onValueChange={v => handleRoleChange(member.id, v)}>
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", roleCfg.color)}>
                            <roleCfg.icon className="h-3 w-3" />
                            {roleCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("text-xs font-medium capitalize", statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          {!isSelf && (
                            <div className="flex items-center justify-end gap-1">
                              {member.status === "active" && (
                                <Button variant="ghost" size="sm"
                                  className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs"
                                  onClick={() => handleSuspend(member)}>
                                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                                  Suspend
                                </Button>
                              )}
                              <Button variant="ghost" size="sm"
                                className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRemove(member)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "suspend" ? "Suspend Member" : "Remove Member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "suspend"
                ? `Suspend ${confirmAction?.member?.name}? They won't be able to sign in until reinstated.`
                : `Remove ${confirmAction?.member?.name} (${confirmAction?.member?.email}) from this organization? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={confirmAction?.type === "remove" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}>
              {confirmAction?.type === "suspend" ? "Suspend" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
