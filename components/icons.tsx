import { LayoutDashboard, Users, Presentation, FileText, Handshake, FileSignature, CreditCard, Percent, Wallet, FolderKanban, SquareCheckBig, ShieldCheck, Bug, Rocket, GraduationCap, Star, Kanban, Contact, Repeat, RefreshCw, Server, Plug, Receipt, NotebookPen, type LucideIcon } from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, leads: Users, demos: Presentation, estimates: FileText, deals: Handshake, agreements: FileSignature,
  payments: CreditCard, commissions: Percent, wallets: Wallet, projects: FolderKanban, tasks: SquareCheckBig, qc: ShieldCheck,
  issues: Bug, deployments: Rocket, trainings: GraduationCap, reviews: Star, board: Kanban, customers: Contact,
  services: Repeat, renewals: RefreshCw, servers: Server, integrations: Plug, expenses: Receipt, notes: NotebookPen,
};
