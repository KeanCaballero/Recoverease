import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...opts,
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PH', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getMoodLabel(rating: number): string {
  if (rating <= 2) return 'Very Poor';
  if (rating <= 4) return 'Poor';
  if (rating <= 6) return 'Fair';
  if (rating <= 8) return 'Good';
  return 'Excellent';
}

export function getMoodColor(rating: number): string {
  if (rating <= 2) return 'text-red-500';
  if (rating <= 4) return 'text-orange-500';
  if (rating <= 6) return 'text-yellow-500';
  if (rating <= 8) return 'text-green-500';
  return 'text-emerald-600';
}
