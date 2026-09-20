"use client";
import { FileText,LayoutDashboard,Layers,LogOut,Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/axios";
import { Link,usePathname,useRouter } from "@/i18n/navigation";
const links=[{href:"/dashboard",key:"dashboard",icon:LayoutDashboard},{href:"/templates",key:"templates",icon:Layers},{href:"/documents",key:"documents",icon:FileText},{href:"/settings",key:"settings",icon:Settings}] as const;
export function Sidebar(){const t=useTranslations("common"),pathname=usePathname(),router=useRouter(); async function logout(){await api.post("/auth/logout");router.replace("/login");router.refresh()}
 return <aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">D</div><div><div className="brand">DocFlow</div><div className="brand-by">by NurByte</div></div></div><nav>{links.map(({href,key,icon:Icon})=><Link className={pathname===href?"active":undefined} href={href} key={href}><Icon size={19}/><span>{t(key)}</span></Link>)}</nav><div className="sidebar-bottom"><span className="version">DocFlow v1.1.0</span><button className="logout" onClick={logout}><LogOut size={18}/><span>{t("logout")}</span></button></div></aside>}
