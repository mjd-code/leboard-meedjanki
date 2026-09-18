import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthForm } from '@/features/auth/AuthForm';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const mode = searchParams.get('mode') as 'login' | 'register' | 'reset' | 'update-password' | null;

  useEffect(() => {
    // Redirect authenticated users to main app (except for password update)
    if (user && mode !== 'update-password') {
      navigate('/app');
    }
  }, [user, mode, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">ObMap</h1>
          <p className="text-muted-foreground mt-2">Your knowledge graph workspace</p>
        </div>
        
        <AuthForm 
          initialMode={mode || 'login'} 
          onSuccess={() => navigate('/app')} 
        />
      </div>
    </div>
  );
}
