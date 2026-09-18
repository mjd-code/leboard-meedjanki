import { useMemo } from 'react';
import { cn } from "@/shared/lib";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  feedback: string[];
}

const calculateStrength = (password: string): StrengthResult => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { score: 0, label: '', color: '', feedback: [] };
  }

  // Length checks
  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');
  
  if (password.length >= 12) score += 1;

  // Character type checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');

  // Common patterns to avoid
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeated characters');
  }
  
  if (/^[a-zA-Z]+$/.test(password) || /^[0-9]+$/.test(password)) {
    score -= 1;
    feedback.push('Mix different character types');
  }

  // Normalize score to 0-4 range
  const normalizedScore = Math.max(0, Math.min(4, Math.floor(score * 4 / 6)));

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = [
    'bg-destructive',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-emerald-500',
  ];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    color: colors[normalizedScore],
    feedback: feedback.slice(0, 3), // Show max 3 feedback items
  };
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= strength.score ? strength.color : 'bg-muted'
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          'font-medium',
          strength.score <= 1 && 'text-destructive',
          strength.score === 2 && 'text-yellow-600',
          strength.score >= 3 && 'text-green-600'
        )}>
          {strength.label}
        </span>
        {strength.feedback.length > 0 && (
          <span className="text-muted-foreground">
            {strength.feedback[0]}
          </span>
        )}
      </div>
    </div>
  );
}
