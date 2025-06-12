"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface ResetPasswordFormProps {
  onSubmit: (password: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  username?: string;
}

export function ResetPasswordForm({ 
  onSubmit, 
  onCancel, 
  isSubmitting,
  username 
}: ResetPasswordFormProps) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error
    setError(null);
    
    // Basic validation
    if (!password) {
      setError(t('lms.password_required') || "Password is required");
      return;
    }
    
    if (password.length < 8) {
      setError(t('lms.password_length') || "Password must be at least 8 characters");
      return;
    }
    
    if (password !== confirmPassword) {
      setError(t('lms.password_mismatch') || "Passwords don't match");
      return;
    }
    
    onSubmit(password);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {username && (
        <div className="mb-4">
          <Label htmlFor="username">{t('lms.username') || "Username"}</Label>
          <Input
            id="username"
            value={username}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>
      )}
      
      <div>
        <Label htmlFor="new-password">{t('lms.new_password') || "New Password"}</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button 
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('lms.password_requirements') || "Password must be at least 8 characters and include a mix of uppercase, lowercase, numbers, and special characters for better security."}
        </p>
      </div>
      
      <div>
        <Label htmlFor="confirm-new-password">{t('lms.confirm_password') || "Confirm New Password"}</Label>
        <Input
          id="confirm-new-password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      
      <div className="flex gap-3 justify-center mt-6">
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('common.cancel') || "Cancel"}
        </Button>
        
        <Button 
          type="submit"
          disabled={isSubmitting}
        >
          {t('lms.reset_password') || "Reset Password"}
        </Button>
      </div>
    </form>
  );
}
