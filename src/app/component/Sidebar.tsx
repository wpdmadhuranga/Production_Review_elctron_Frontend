import { Award, ChevronDown, ChevronRight, FileText, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import logoSrc from "../../assets/laugfs-tyre-logo.png";
import { useAuth } from "../auth/useAuth";

interface SubMenuItem {
  title: string;
  path: string;
}

interface MenuItem {
  title: string;
  icon: React.ElementType;
  path?: string;
  subItems?: SubMenuItem[];
}

export function Sidebar() {
  const [isProductionReportsOpen, setIsProductionReportsOpen] = useState(false);
  const { isAdmin } = useAuth();

  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    !isAdmin && {
      title: "Grading",
      icon: Award,
      path: "/grading",
    },
    {
      title: "Production Reports",
      icon: FileText,
      subItems: [
        { title: "Summary", path: "/production-reports/summary" },
        { title: "Item Wise", path: "/production-reports/item-wise" },
        { title: "Defect Wise", path: "/production-reports/defect-wise" },
        { title: "Shift Wise", path: "/production-reports/shift-wise" },
      ],
    },
  ].filter(Boolean) as MenuItem[];

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10">
            <img src={logoSrc} alt="Company logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">TyreTech</h2>
            <p className="text-gray-400 text-xs">Manufacturing</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.title}>
              {item.subItems ? (
                // Menu item with submenu
                <div>
                  <button
                    onClick={() => setIsProductionReportsOpen(!isProductionReportsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    {isProductionReportsOpen ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                  
                  {/* Submenu */}
                  {isProductionReportsOpen && (
                    <ul className="mt-2 ml-4 space-y-1">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.path}>
                          <NavLink
                            to={subItem.path}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                              }`
                            }
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span className="text-sm">{subItem.title}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // Regular menu item
                <NavLink
                  to={item.path!}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          <p>© 2026 TyreTech Systems</p>
        </div>
      </div>
    </aside>
  );
}
