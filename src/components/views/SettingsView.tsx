/**
 * â”€â”€â”€ SettingsView.tsx â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 * Application settings shell with sidebar navigation and tab routing.
 * Each settings section is extracted into its own component.
 *
 * Exports: default SettingsView component
 * Related: AppearanceTab, MusicTab, SystemTab, AboutTab,
 *          SettingsSync, KeybindsSettings, ActionsSettings,
 *          SidebarHistory, SidebarTrash
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */
import { useState, useEffect } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarHistory } from "@/components/layout/sidebar/SidebarHistory";
import { SidebarTrash } from "@/components/layout/sidebar/SidebarTrash";
import {
    SpeakerHigh,
    Palette,
    ClockCounterClockwise,
    Trash,
    Cloud,
    Gear,
    Info,
} from "@phosphor-icons/react";
import { Keyboard, Lightning } from "@phosphor-icons/react";
import { AppearanceTab } from "@/components/settings/AppearanceTab";
import { MusicTab } from "@/components/settings/MusicTab";
import { SystemTab } from "@/components/settings/SystemTab";
import { AboutTab } from "@/components/settings/AboutTab";
import { SettingsSync } from "@/components/settings/SettingsSync";
import { KeybindsSettings } from "@/components/settings/KeybindsSettings";
import { ActionsSettings } from "@/components/settings/ActionsSettings";

type SettingsTab = 'appearance' | 'music' | 'keybinds' | 'actions' | 'system' | 'sync' | 'history' | 'trash' | 'about';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPONENT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function SettingsView() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

    const isLegalRoute = location.pathname.startsWith('/settings/legal');

    useEffect(() => {
        if (isLegalRoute) {
            setActiveTab('about');
        } else {
            const tab = searchParams.get('tab');
            if (tab && ['appearance', 'music', 'keybinds', 'actions', 'system', 'sync', 'history', 'trash', 'about'].includes(tab)) {
                setActiveTab(tab as SettingsTab);
            }
        }
    }, [searchParams, isLegalRoute]);

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       JSX RENDER
       â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    return (
        <div className="flex h-full w-full bg-transparent text-foreground overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0 backdrop-blur-sm">
                <div className="p-6 pb-4">
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your workspace preferences.</p>
                </div>
                
                <nav className="flex-1 px-4 py-2 space-y-6">
                    <div>
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferences</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => navigate('/settings?tab=appearance')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'appearance' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Palette size={18} weight={activeTab === 'appearance' ? "fill" : "regular"} />
                                Appearance
                            </button>
                            <button
                                onClick={() => navigate('/settings?tab=music')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'music' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <SpeakerHigh size={18} weight={activeTab === 'music' ? "fill" : "regular"} />
                                Audio & Media
                            </button>
                            <button
                                onClick={() => navigate('/settings?tab=keybinds')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'keybinds' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Keyboard size={18} weight={activeTab === 'keybinds' ? "fill" : "regular"} />
                                Shortcuts
                            </button>
                            <button
                                onClick={() => navigate('/settings?tab=actions')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'actions' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Lightning size={18} weight={activeTab === 'actions' ? "fill" : "regular"} />
                                Actions
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => navigate('/settings?tab=history')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'history' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <ClockCounterClockwise size={18} weight={activeTab === 'history' ? "fill" : "regular"} />
                                History
                            </button>
                            <button
                                onClick={() => navigate('/settings?tab=trash')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'trash' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Trash size={18} weight={activeTab === 'trash' ? "fill" : "regular"} />
                                Trash
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data & Account</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => navigate('/settings?tab=sync')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'sync' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Cloud size={18} weight={activeTab === 'sync' ? "fill" : "regular"} />
                                Sync & Backup
                            </button>
                            <button
                                onClick={() => navigate('/settings?tab=system')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'system' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Gear size={18} weight={activeTab === 'system' ? "fill" : "regular"} />
                                System
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Support</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => navigate('/settings?tab=about')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'about' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Info size={18} weight={activeTab === 'about' ? "fill" : "regular"} />
                                About
                            </button>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-transparent">
                <div className="max-w-4xl mx-auto p-8 pb-20">
                    {activeTab === 'appearance' && <AppearanceTab />}

                    {activeTab === 'sync' && <SettingsSync />}

                    {activeTab === 'music' && <MusicTab />}

                    {activeTab === 'keybinds' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Keyboard className="text-primary" size={24} />
                                    Keyboard Shortcuts
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Customize your keyboard shortcuts
                                </p>
                            </div>
                            <KeybindsSettings />
                        </div>
                    )}

                    {activeTab === 'actions' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Lightning className="text-primary" size={24} />
                                    Actions
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    View all available actions
                                </p>
                            </div>
                            <ActionsSettings />
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <SidebarHistory onBack={() => {}} variant="settings-page" />
                        </div>
                    )}

                    {activeTab === 'trash' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <SidebarTrash onBack={() => {}} variant="settings-page" />
                        </div>
                    )}

                    {activeTab === 'system' && <SystemTab />}

                    {activeTab === 'about' && <AboutTab />}
                </div>
            </div>
        </div>
    );
}

