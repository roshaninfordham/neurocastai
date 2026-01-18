import { cn } from './ui/utils';
import {
  PlayCircle,
  LayoutDashboard,
  FileSearch,
  FileText,
  Mic,
  BarChart3,
  Package,
  Camera
} from 'lucide-react';

export type Page = 'start' | 'command' | 'evidence' | 'handoff' | 'voice' | 'observability' | 'products';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const navItems: { id: Page | 'home-checkin'; label: string; icon: any; href?: string }[] = [
  { id: 'start', label: 'Start Case', icon: PlayCircle },
  { id: 'home-checkin', label: 'Home Check-In', icon: Camera, href: '/home-checkin' },
  { id: 'command', label: 'Command Center', icon: LayoutDashboard },
  { id: 'evidence', label: 'Evidence & Audit', icon: FileSearch },
  { id: 'handoff', label: 'Handoff Packet', icon: FileText },
  { id: 'voice', label: 'Voice Commander', icon: Mic },
  { id: 'observability', label: 'Observability', icon: BarChart3 },
  // { id: 'products', label: 'Products', icon: Package }, // TODO: Enable after fixing build
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          if (item.href) {
            return (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id as Page)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-400">
          NeuroCast AI v1.0
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Stroke Care Coordination Layer
        </p>
      </div>
    </div>
  );
}
