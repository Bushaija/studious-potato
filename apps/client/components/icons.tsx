export type IconProps = React.HTMLAttributes<SVGElement>;

import {
  Activity,
  ClipboardList,
  ClipboardCheck,
  CheckSquare,
  Check,
  Layers,
  LucideNotebookTabs,
  FileText,
  LayoutDashboardIcon,
  BarChart,
  BarChart3,
  Calculator,
  Calendar,
  TrendingUp,
  Briefcase,
  Folder,
  FolderOpen,
  Building,
  Eye,
  CheckCircle,
  DollarSign,
  Scale,
  ArrowUpDown,
  FileDown,
  Percent,
  Target,
  Shield,
  Tags,
  List,
  GitBranch,
  Settings,
  Users,
  Database,
  Zap,
  Cog,
  Globe,
  History,
  HardDrive,
  ArrowRight,
  LayersIcon, // alias for bulk operations, if needed
  FileBarChart,
  // keep the rest of your existing imports...
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircuitBoardIcon,
  Command,
  CreditCard,
  File,
  HelpCircle,
  Image,
  Laptop,
  Loader2,
  LogIn,
  LucideIcon,
  LucideProps,
  LucideShoppingBag,
  Moon,
  MoreVertical,
  Pizza,
  Plus,
  Save,
  SunMedium,
  Trash,
  Twitter,
  User,
  UserCircle2Icon,
  UserPen,
  UserX2Icon,
  X,
  LockKeyhole,
  Code,
} from 'lucide-react';

export type Icon = LucideIcon;

export const Icons = {
  // Base / Shared
  dashboard: ({ ...props }: LucideProps) => (
    <LayoutDashboardIcon suppressHydrationWarning {...props} />
  ),
  activity: Activity,
  logo: Command,
  settings: Settings,
  login: LogIn,
  close: X,
  product: LucideShoppingBag,
  spinner: Loader2,
  kanban: ({ ...props }: LucideProps) => (
    <CircuitBoardIcon suppressHydrationWarning {...props} />
  ),
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash,
  employee: UserX2Icon,
  post: ({ ...props }: LucideProps) => (
    <FileText suppressHydrationWarning {...props} />
  ),
  page: ({ ...props }: LucideProps) => (
    <File suppressHydrationWarning {...props} />
  ),
  userPen: UserPen,
  lockerKeyHole: LockKeyhole,
  user2: UserCircle2Icon,
  code: Code,
  media: ({ ...props }: LucideProps) => (
    <Image suppressHydrationWarning {...props} />
  ),
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  save: Save,
  warning: AlertTriangle,
  user: User,
  arrowRight: ArrowRight,
  help: HelpCircle,
  pizza: Pizza,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,

  // Budget Planning & Execution
  clipboardList: ({ ...props }: LucideProps) => (
    <ClipboardList suppressHydrationWarning {...props} />
  ),
  clipboardCheck: ({ ...props }: LucideProps) => (
    <ClipboardCheck suppressHydrationWarning {...props} />
  ),
  checkList: ({ ...props }: LucideProps) => (
    <CheckSquare suppressHydrationWarning {...props} />
  ),
  fileText: FileText,
  barChart: BarChart,
  barChart3: BarChart3,
  calculator: Calculator,
  calendar: Calendar,
  trendingUp: TrendingUp,

  // Projects & Facility
  briefcase: Briefcase,
  folder: Folder,
  folderOpen: FolderOpen,
  building: Building,
  eye: Eye,
  checkCircle: CheckCircle,

  // Financial Reports
  notebookTabs: ({ ...props }: LucideProps) => (
    <LucideNotebookTabs suppressHydrationWarning {...props} />
  ),
  dollarSign: DollarSign,
  scale: Scale,
  arrowUpDown: ArrowUpDown,
  fileDown: FileDown,

  // Analytics & Insights
  percent: Percent,
  target: Target,
  shield: Shield,

  // Schema Management
  tags: Tags,
  list: List,
  gitBranch: GitBranch,
  layout: Layers, // layout & schema templates
  layers: Layers,

  // Administration
  users: Users,
  database: Database,
  zap: Zap,
  cog: Cog,
  globe: Globe,
  history: History,
  hardDrive: HardDrive,
  fileBarChart: FileBarChart,

  // Social & Misc
  gitHub: ({ ...props }: LucideProps) => (
    <svg
      aria-hidden='true'
      focusable='false'
      data-prefix='fab'
      data-icon='github'
      role='img'
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 496 512'
      {...props}
    >
      <path
        fill='currentColor'
        d='M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8z'
      ></path>
    </svg>
  ),
  twitter: Twitter,
  check: Check,
};
