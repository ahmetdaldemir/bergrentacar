import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.login({ email, password });
      
      if (result.success || result.token || result.user) {
        // Save user data
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        if (result.token) {
          localStorage.setItem('token', result.token);
        }

        // Save defaultLanguage if provided
        if (result.defaultLanguage) {
          localStorage.setItem('defaultLanguage', JSON.stringify(result.defaultLanguage));
          localStorage.setItem('selectedLanguageId', result.defaultLanguage.id);
          localStorage.setItem('selectedLanguage', JSON.stringify(result.defaultLanguage));
          
          // Trigger language change event
          window.dispatchEvent(new CustomEvent('languageChanged', { detail: result.defaultLanguage }));
        }

        toast({
          title: "Başarılı",
          description: "Giriş yapıldı",
        });
        onOpenChange(false);
        setEmail("");
        setPassword("");
        
        // Reload page to apply language changes if defaultLanguage was set
        if (result.defaultLanguage) {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } else {
        toast({
          title: "Hata",
          description: result.message || "Giriş bilgileri hatalı",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Giriş Yap</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;