"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Star, Music, User } from "lucide-react";

interface BottomNavigationProps {
  className?: string;
}

export default function BottomNavigation({
  className = "",
}: BottomNavigationProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      icon: "home",
      label: "Home",
      isActive: pathname === "/",
    },
    {
      href: "/library",
      icon: "star",
      label: "Library",
      isActive: pathname === "/library" || pathname.startsWith("/song/"),
    },
    {
      href: "/my-songs",
      icon: "music",
      label: "My Songs",
      isActive: pathname === "/my-songs",
    },
    {
      href: "/profile",
      icon: "user",
      label: "Profile",
      isActive: pathname === "/profile",
    },
  ];

  return (
    <nav className={`bottom-nav ${className}`}>
      <div className="flex justify-around items-center h-20 text-melodia-teal">
        {navItems.map((item) => {
          const getIcon = () => {
            switch (item.icon) {
              case "home":
                return (
                  <Home
                    size={24}
                    className={item.isActive ? "fill-current" : ""}
                  />
                );
              case "star":
                return (
                  <Star
                    size={24}
                    className={item.isActive ? "fill-current" : ""}
                  />
                );
              case "music":
                return (
                  <Music
                    size={24}
                    className={item.isActive ? "fill-current" : ""}
                  />
                );
              case "user":
                return (
                  <User
                    size={24}
                    className={item.isActive ? "fill-current" : ""}
                  />
                );
              default:
                return null;
            }
          };

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${item.isActive ? "active" : ""}`}
            >
              {getIcon()}
              <span className="nav-text">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
