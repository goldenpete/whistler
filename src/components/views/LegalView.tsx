import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    const location = useLocation();
    const { projects, largeTogglesThemingEnabled } = useStore(state => ({
        projects: state.projects,
        largeTogglesThemingEnabled: state.largeTogglesThemingEnabled
    }));
    const isLoggedIn = projects.length > 0;

    // Determine where to go back to
    const handleBack = () => {
        const from = location.state?.from;
        if (from === 'settings') {
            navigate('/settings?tab=about');
        } else if (from === 'welcome' || !isLoggedIn) {
            navigate('/welcome');
        } else {
            navigate(-1);
        }
    };

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
                                Whistlerbox is open-source software licensed under the GNU Affero General Public License v3.0.
                            </p>
                        </section>
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground/90">GNU AFFERO GENERAL PUBLIC LICENSE</h3>
                            <p className="text-muted-foreground text-xs mb-4">Version 3, 19 November 2007</p>
                            <div className="text-muted-foreground font-mono text-[11px] bg-muted/30 p-6 rounded-2xl leading-relaxed max-h-[500px] overflow-y-auto border border-border/50 custom-scrollbar whitespace-pre-wrap">
                                {`GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

Preamble

The GNU Affero General Public License is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software.

The licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, our General Public Licenses are intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users.

When we speak of free software, we are referring to freedom, not price. Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for them if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.

Developers that use our General Public Licenses protect your rights with two steps: (1) assert copyright on the software, and (2) offer you this License which gives you legal permission to copy, distribute and/or modify the software.

A secondary benefit of defending all users' freedom is that improvements made in alternate versions of the program, if they receive widespread use, become available for other developers to incorporate. Many developers of free software are heartened and encouraged by the resulting cooperation. However, in the case of software used on network servers, this result may fail to come about. The GNU General Public License permits making a modified version and letting the public access it on a server without ever releasing its source code to the public.

The GNU Affero General Public License is designed specifically to ensure that, in such cases, the modified source code becomes available to the community. It requires the operator of a network server to provide the source code of the modified version running there to the users of that server. Therefore, public use of a modified version, on a publicly accessible server, gives the public access to the source code of the modified version.`}
                            </div>
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
                    onClick={() => navigate(`/legal/${t.id}`, { replace: true, state: location.state })}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        tab === t.id 
                            ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background text-foreground shadow-sm")
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <t.icon size={18} weight={tab === t.id ? "fill" : "regular"} />
                    {t.label}
                </button>
            ))}
        </div>
    );

    const content = (
        <div className="max-w-4xl mx-auto p-8 pb-20">
            <div className="flex items-center gap-4 mb-10">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
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
    );

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen w-screen overflow-y-auto bg-zinc-950 text-zinc-200">
                {content}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-transparent">
            {content}
        </div>
    );
}
