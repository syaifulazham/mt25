"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ExternalLink, Copy, Check, Key } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";
import { Label } from "@/components/ui/label";
import { SimplePasswordForm } from "./simple-form";
import { ResetPasswordForm } from "./reset-password-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface MoodleUserStatus {
  exists: boolean;
  username?: string;
  id?: number;
}

interface UserDetails {
  email: string;
  firstname: string;
  lastname: string;
  authMethod: "manual" | "oauth2";
}

export default function LMSPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [userStatus, setUserStatus] = useState<MoodleUserStatus | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      checkLmsUser();
    } else if (status === "unauthenticated") {
      router.push('/participants/auth/login');
    }
  }, [session, status, router]);
  
  const checkLmsUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/participants/lms/check-user?email=${session?.user?.email}`);
      
      if (!response.ok) {
        throw new Error("Failed to check LMS user status");
      }
      
      const data = await response.json();
      setUserStatus(data);
    } catch (error) {
      console.error("Error checking LMS user:", error);
      toast.error(t('lms.error_checking_user') || "Error checking LMS user status");
    } finally {
      setLoading(false);
    }
  };
  
  const prepareRegistration = async () => {
    try {
      // Get user details from session and split name
      const nameParts = (session?.user?.name || "").split(" ");
      const firstname = nameParts[0] || "";
      const lastname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
      
      // Always use manual auth for LMS registration
      const authMethod = "manual";
      
      setUserDetails({
        email: session?.user?.email || "",
        firstname,
        lastname,
        authMethod
      });
      
      setShowPreview(true);
    } catch (error) {
      console.error("Error preparing registration:", error);
      toast.error("Error preparing registration details");
    }
  };
  
  const registerLmsUser = async (password: string) => {
    try {
      if (!userDetails) {
        toast.error("Registration details are missing");
        return;
      }
      
      setRegistering(true);
      const response = await fetch('/api/participants/lms/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userDetails.email,
          name: `${userDetails.firstname} ${userDetails.lastname}`.trim(),
          password: password
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register user in LMS");
      }
      
      const data = await response.json();
      setShowPreview(false);
      setUserStatus({ exists: true, username: data.username, id: data.id });
      toast.success(t('lms.registration_success') || "Successfully registered in LMS");
    } catch (error) {
      console.error("Error registering LMS user:", error);
      toast.error(t('lms.error_registering') || "Error registering in LMS");
    } finally {
      setRegistering(false);
    }
  };
  
  const resetPassword = async (password: string) => {
    try {
      setResettingPassword(true);
      
      const response = await fetch('/api/participants/lms/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session?.user?.email,
          password
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reset password");
      }
      
      const data = await response.json();
      setShowResetPasswordModal(false);
      toast.success(t('lms.password_reset_success') || "Password has been reset successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(t('lms.error_resetting_password') || "Error resetting password");
    } finally {
      setResettingPassword(false);
    }
  };
  
  const openLmsLogin = () => {
    setShowLoginModal(true);
  };

  const goToLmsLogin = () => {
    const baseUrl = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://bengkel.techlympics.my';
    const loginUrl = `${baseUrl}/login/index.php`;
    window.open(loginUrl, '_blank');
  };

  const copyUsername = () => {
    if (userStatus?.username) {
      navigator.clipboard.writeText(userStatus.username)
        .then(() => {
          setCopied(true);
          toast.success(t('lms.username_copied') || "Username copied to clipboard");
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          toast.error(t('lms.copy_error') || "Failed to copy username");
        });
    }
  };
  
  // Function to handle redirection with visual feedback
  const handleLmsRedirect = () => {
    toast.info(t('lms.redirecting') || "Opening LMS login page...");
    setTimeout(() => {
      goToLmsLogin();
    }, 500);
  };
  
  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto py-12 max-w-7xl">
        <Card>
          <CardContent className="pt-6 flex justify-center items-center min-h-[300px]">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">{t('lms.checking_status') || "Checking LMS status..."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <h1 className="text-2xl font-semibold mb-6">{t('lms.title') || "Learning Management System"}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('lms.account_status') || "LMS Account Status"}</CardTitle>
          <CardDescription>
            {t('lms.description') || "Check your Learning Management System (LMS) account status"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6">
            {userStatus?.exists ? (
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-xl font-medium mb-2">{t('lms.account_exists') || "LMS Account Exists"}</h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  {t('lms.account_exists_message') || "You already have an account in our Learning Management System. You can access your courses and training materials by clicking the button below."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={openLmsLogin} className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t('lms.login_to_lms') || "Login to LMS"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowResetPasswordModal(true)}
                    className="gap-2"
                  >
                    <Key className="h-4 w-4" />
                    {t('lms.reset_password_button') || "Reset Password"}
                  </Button>
                </div>
              </div>
            ) : showPreview && userDetails ? (
              <div className="flex flex-col items-center text-center max-w-md">
                <h2 className="text-xl font-medium mb-4">{t('lms.preview_registration') || "Review Registration Details"}</h2>
                <p className="text-gray-600 mb-4">
                  {t('lms.preview_message') || "Please review your registration details before creating your LMS account:"}
                </p>
                
                <div className="w-full grid gap-4 mb-6 text-left">
                  <div>
                    <Label>{t('lms.email') || "Email"}</Label>
                    <div className="text-sm mt-1">{userDetails.email}</div>
                  </div>
                  
                  <div>
                    <Label>{t('lms.firstname') || "First Name"}</Label>
                    <div className="text-sm mt-1">{userDetails.firstname}</div>
                  </div>
                  
                  <div>
                    <Label>{t('lms.lastname') || "Last Name"}</Label>
                    <div className="text-sm mt-1">{userDetails.lastname}</div>
                  </div>
                  
                  <div>
                    <Label>{t('lms.auth_method') || "Authentication Method"}</Label>
                    <div className="text-sm mt-1">
                      {userDetails.authMethod === "oauth2" ? 
                        (t('lms.auth_google') || "Google Authentication") : 
                        (t('lms.auth_manual') || "Email/Password Authentication")}
                    </div>
                  </div>
                </div>
                
                {/* Simple password form */}
                <SimplePasswordForm 
                  onSubmit={registerLmsUser}
                  onCancel={() => setShowPreview(false)}
                  isSubmitting={registering}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <XCircle className="h-16 w-16 text-amber-500 mb-4" />
                <h2 className="text-xl font-medium mb-2">{t('lms.no_account') || "No LMS Account Found"}</h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  {t('lms.no_account_message') || "You don't have an account in our Learning Management System yet. Register now to access training materials and courses for Techlympics 2025."}
                </p>
                <Button 
                  onClick={prepareRegistration}
                  className="gap-2"
                >
                  {t('lms.register_in_lms') || "Register in LMS"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* LMS Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('lms.login_title') || "Login to Learning Management System"}</DialogTitle>
            <DialogDescription>
              {t('lms.login_description') || "Enter your password to access the LMS platform."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <Label className="mb-2 block">{t('lms.username') || "Username"}</Label>
              <div className="flex items-center">
                <div className="bg-primary/10 text-primary rounded-l-md p-3 flex-1 font-mono break-all border-l-4 border-primary overflow-x-auto relative group">
                  <div className="absolute inset-0 bg-primary/10 animate-pulse-subtle rounded-l-md"></div>
                  <span className="font-medium relative z-10">{userStatus?.username}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-l-none" 
                  onClick={copyUsername}
                  aria-label={t('lms.copy_username') || "Copy username"}
                  title={t('lms.copy_username') || "Copy username"}
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  <span className="sr-only">{copied ? (t('lms.username_copied') || "Username copied") : (t('lms.copy_username') || "Copy username")}</span>
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              {t('lms.login_instructions') || "Your username is shown above. When you click the button below, you'll be redirected to the LMS login page."}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {t('lms.username_hint') || "Enter your username and password on the Moodle login page to access your courses."}
            </p>
            
            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button variant="outline">{t('common.cancel') || "Cancel"}</Button>
              </DialogClose>
              <Button onClick={handleLmsRedirect} className="gap-2 transition-all hover:bg-primary/90 active:scale-95">
                <ExternalLink className="h-4 w-4" />
                {t('lms.go_to_login') || "Go to LMS Login"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Password Reset Modal */}
      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('lms.reset_password_title') || "Reset LMS Password"}</DialogTitle>
            <DialogDescription>
              {t('lms.reset_password_description') || "Create a new password for your LMS account. Your old password will no longer be valid."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <ResetPasswordForm
              onSubmit={resetPassword}
              onCancel={() => setShowResetPasswordModal(false)}
              isSubmitting={resettingPassword}
              username={userStatus?.username}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
