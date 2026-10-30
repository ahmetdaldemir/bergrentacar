import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { MessageCircle, Send, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "react-router-dom";

const LiveChat = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    // TODO: Implement live chat functionality
    console.log('Sending message:', message);
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('header.liveChat')} | Berg Rent a Car`}
        description={t('liveChat.seoDescription')}
        keywords={t('liveChat.seoKeywords')}
        noindex={true}
      />
      <Header />
      
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t('header.liveChat')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('liveChat.subtitle')}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Chat Interface */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('liveChat.chatWithUs')}</CardTitle>
              <CardDescription>{t('liveChat.chatDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chat Messages Area */}
              <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-muted/30">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-primary text-primary-foreground rounded-lg p-3 inline-block">
                        <p className="text-sm">{t('liveChat.welcomeMessage')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Just now</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('liveChat.typeMessage')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && message.trim()) {
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Contact Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>{t('liveChat.callUs')}</span>
                </CardTitle>
                <CardDescription>{t('liveChat.callDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/contact-us">
                  <Button variant="outline" className="w-full">
                    {t('liveChat.viewContactInfo')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>{t('liveChat.emailUs')}</span>
                </CardTitle>
                <CardDescription>{t('liveChat.emailDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/contact-us">
                  <Button variant="outline" className="w-full">
                    {t('liveChat.sendEmail')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LiveChat;

