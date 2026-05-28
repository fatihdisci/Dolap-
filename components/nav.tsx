'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shirt, Upload, Sparkles, BookOpen } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dolabım', Icon: Shirt },
  { href: '/yukle', label: 'Yükle', Icon: Upload },
  { href: '/onerim', label: 'Öneri', Icon: Sparkles },
  { href: '/kombinlerim', label: 'Kombinlerim', Icon: BookOpen },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--kenar)] bg-[var(--panel)] safe-area-pb">
      <div className="mx-auto flex max-w-lg">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active
                  ? 'text-[var(--murekkep)]'
                  : 'text-[var(--murekkep)] opacity-40 hover:opacity-70'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
