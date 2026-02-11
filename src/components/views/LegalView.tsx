import { useParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { ArrowLeft, Scroll, ShieldCheck, FileText } from "@phosphor-icons/react";

const TABS = [
    { id: 'terms', label: 'Terms of Service', icon: Scroll },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'license', label: 'License', icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

export default function LegalView() {
    const { tab = 'terms' } = useParams<{ tab: TabId }>();
    const navigate = useNavigate();
    const projects = useStore(state => state.projects);
    const isLoggedIn = projects.length > 0;

    const activeTab = TABS.find(t => t.id === tab) || TABS[0];

    const renderContent = () => {
        switch (tab) {
            case 'privacy':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section className="space-y-3">
                            <h2 className="text-xl font-bold">Privacy Policy</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Your privacy is important to us. It is Whistlerbox's policy to respect your privacy regarding any information we may collect from you across our website and other sites we own and operate.
                            </p>
                        </section>
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold">1. Information we collect</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
                            </p>
                        </section>
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold">2. Data Storage</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.
                            </p>
                        </section>
                    </div>
                );
            case 'license':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section className="space-y-3">
                            <h2 className="text-xl font-bold">License</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Copyright (c) 2026 Whistlerbox Labs
                            </p>
                        </section>
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold">MIT License</h3>
                            <p className="text-muted-foreground font-mono text-sm bg-muted/50 p-4 rounded-lg leading-relaxed">
                                Permission is hereby granted, free of charge, to any person obtaining a copy
                                of this software and associated documentation files (the "Software"), to deal
                                in the Software without restriction, including without limitation the rights
                                to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                                copies of the Software, and to permit persons to whom the Software is
                                furnished to do so, subject to the following conditions:<br /><br />
                                The above copyright notice and this permission notice shall be included in all
                                copies or substantial portions of the Software.<br /><br />
                                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                                AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                                OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                                SOFTWARE.
                            </p>
                        </section>
                    </div>
                );
            case 'terms':
            default:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section className="space-y-3">
                            <h2 className="text-xl font-bold">Terms of Service</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                By accessing the website at Whistlerbox, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
                            </p>
                        </section>
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold">1. Use License</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Permission is granted to temporarily download one copy of the materials (information or software) on Whistlerbox's website for personal, non-commercial transitory viewing only.
                            </p>
                        </section>
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold">2. Disclaimer</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                The materials on Whistlerbox's website are provided on an 'as is' basis. Whistlerbox makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                            </p>
                        </section>
                    </div>
                );
        }
    };

    const TabsHeader = () => (
        <div className="flex items-center justify-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50 mb-8">
            {TABS.map((t) => (
                <button
                    key={t.id}
                    onClick={() => navigate(`/legal/${t.id}`)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        tab === t.id 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <t.icon size={18} weight={tab === t.id ? "fill" : "regular"} />
                    {t.label}
                </button>
            ))}
        </div>
    );

    if (!isLoggedIn) {
        return (
            <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-white p-6 overflow-y-auto">
                <div className="max-w-3xl w-full space-y-8 py-12">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <Link to="/welcome" className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors self-start">
                            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                            Back to Welcome
                        </Link>
                        <WhistlerLogo width={80} height={80} />
                        <h1 className="text-3xl font-bold tracking-tighter">Legal Information</h1>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl">
                        <TabsHeader />
                        <div className="min-h-[400px]">
                            {renderContent()}
                        </div>
                    </div>

                    <p className="text-center text-zinc-500 text-xs">
                        © 2026 Whistlerbox Labs. All rights reserved.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-transparent">
            <div className="max-w-4xl mx-auto p-8 pb-20">
                <div className="flex items-center gap-4 mb-10">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                        <ArrowLeft size={20} />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tighter">Legal</h1>
                </div>

                <div className="bg-card/30 border border-border rounded-3xl p-8 md:p-12">
                    <TabsHeader />
                    <div className="min-h-[400px]">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
