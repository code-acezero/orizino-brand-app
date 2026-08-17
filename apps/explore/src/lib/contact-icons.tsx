import React from "react";
import {
  Mail, Phone, Briefcase, Handshake, MapPin, Globe,
  Clock, Truck, RefreshCw, Info, Star,
} from "lucide-react";
import type { ContactIconKey } from "@/lib/orizino-config";
import { InstagramIcon } from "./orizino-icons";

export type IconComp = React.ComponentType<{ className?: string }>;

export const CONTACT_ICON_MAP: Record<ContactIconKey, IconComp> = {
  mail: Mail,
  phone: Phone,
  briefcase: Briefcase,
  handshake: Handshake,
  instagram: InstagramIcon,
  mapPin: MapPin,
  globe: Globe,
  clock: Clock,
  truck: Truck,
  refresh: RefreshCw,
  info: Info,
  sparkles: Star,
};

export const CONTACT_ICON_OPTIONS: { key: ContactIconKey; label: string }[] = [
  { key: "mail", label: "Mail" },
  { key: "phone", label: "Phone" },
  { key: "briefcase", label: "Briefcase" },
  { key: "handshake", label: "Handshake" },
  { key: "instagram", label: "Instagram" },
  { key: "mapPin", label: "Map Pin" },
  { key: "globe", label: "Globe" },
  { key: "clock", label: "Clock" },
  { key: "truck", label: "Truck" },
  { key: "refresh", label: "Refresh" },
  { key: "info", label: "Info" },
  { key: "sparkles", label: "Star" },
];

export const CONTACT_LINK_KIND_OPTIONS: { key: string; label: string }[] = [
  { key: "mailto", label: "Email (mailto:)" },
  { key: "tel", label: "Phone (tel:)" },
  { key: "url", label: "Website URL" },
  { key: "instagram", label: "Instagram handle" },
  { key: "map", label: "Map / address" },
  { key: "none", label: "No link" },
];
