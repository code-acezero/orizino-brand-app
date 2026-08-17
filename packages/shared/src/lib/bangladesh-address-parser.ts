import { BD_COURIER_LOCATIONS, type CourierLocation } from "./courier-locations";

export interface ParsedCustomerInfo {
  name: string;
  phone: string;
  email: string;
  fullAddress: string;
  district: string;
  thana: string;
  postalCode: string;
  notes: string;
  detectedSource?: "whatsapp" | "page" | "tiktok" | "instagram" | "offline";
  detectedZone?: string;
  confidenceScore: number; // 0 to 100
  matchedFields: string[];
}

export interface DetectedLocation {
  district: string;
  thana: string;
  postalCode: string;
  isDhaka: boolean;
  isSuburbs: boolean;
  zoneType: "inside_dhaka" | "suburbs" | "outside_dhaka_sadar" | "outside_dhaka_upazila" | "inter_district";
  matchedLocation: CourierLocation | null;
  formattedLocation: string;
}

// Convert Bengali digits (০-৯) to standard Western digits (0-9)
export function normalizeBengaliDigits(input: string): string {
  const bnToEnMap: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  };
  return input.replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);
}

// Common aliases and romanized spelling variations for Bangladesh districts
const DISTRICT_ALIASES: Record<string, string[]> = {
  "Dhaka": ["dhaka", "dacca", "ঢাকা"],
  "Chattogram": ["chattogram", "chittagong", "ctg", "চট্টগ্রাম"],
  "Cox's Bazar": ["cox's bazar", "coxsbazar", "coxs bazar", "কক্সবাজার"],
  "Cumilla": ["cumilla", "comilla", "কুমিল্লা"],
  "Brahmanbaria": ["brahmanbaria", "b.baria", "bbaria", "ব্রাহ্মণবাড়িয়া"],
  "Gazipur": ["gazipur", "গাজীপুর"],
  "Narayanganj": ["narayanganj", "narayangonj", "নারায়ণগঞ্জ", "নারায়নগঞ্জ"],
  "Narsingdi": ["narsingdi", "নরসিংদী"],
  "Munshiganj": ["munshiganj", "munshigonj", "মুন্সীগঞ্জ"],
  "Manikganj": ["manikganj", "manikgonj", "মানিকগঞ্জ"],
  "Tangail": ["tangail", "টাঙ্গাইল"],
  "Mymensingh": ["mymensingh", "ময়মনসিংহ"],
  "Sylhet": ["sylhet", "সিলেট"],
  "Moulvibazar": ["moulvibazar", "moulvibazer", "moulovibazar", "মৌলভীবাজার"],
  "Habiganj": ["habiganj", "habigonj", "হবিগঞ্জ"],
  "Sunamganj": ["sunamganj", "sunamgonj", "সুনামগঞ্জ"],
  "Rajshahi": ["rajshahi", "রাজশাহী"],
  "Bogura": ["bogura", "bogra", "বগুড়া"],
  "Pabna": ["pabna", "পাবনা"],
  "Sirajganj": ["sirajganj", "sirajgonj", "সিরাজগঞ্জ"],
  "Naogaon": ["naogaon", "নওগাঁ"],
  "Natore": ["natore", "নাটোর"],
  "Rangpur": ["rangpur", "রংপুর"],
  "Dinajpur": ["dinajpur", "দিনাজপুর"],
  "Kurigram": ["kurigram", "কুড়িগ্রাম"],
  "Khulna": ["khulna", "খুলনা"],
  "Jashore": ["jashore", "jessore", "যশোর"],
  "Kushtia": ["kushtia", "কুষ্টিয়া"],
  "Satkhira": ["satkhira", "সাতক্ষীরা"],
  "Barishal": ["barishal", "barisal", "বরিশাল"],
  "Patuakhali": ["patuakhali", "পটুয়াখালী"],
  "Faridpur": ["faridpur", "ফরিদপুর"],
  "Feni": ["feni", "ফেনী"],
  "Noakhali": ["noakhali", "নোয়াখালী"],
};

// Sub-urban areas around Dhaka (Steadfast Suburbs tariff ৳105)
const SUBURB_KEYWORDS = [
  "gazipur", "savar", "narayanganj", "keraniganj", "tongi", "ashulia",
  "dhamrai", "sreepur", "sonargaon", "rupganj", "araihazar", "kaliganj",
  "bypile", "hemayetpur", "zirabo", "baipail", "epz", "gazipur sadar",
  "গাজীপুর", "সাভার", "নারায়ণগঞ্জ", "টঙ্গী", "আশুলিয়া", "কেরানীগঞ্জ"
];

// Common Dhaka metropolitan areas (Steadfast Inside Dhaka tariff ৳70)
const DHAKA_METRO_KEYWORDS = [
  "dhanmondi", "gulshan", "banani", "uttara", "mirpur", "mohammadpur",
  "badda", "khilgaon", "motijheel", "bashundhara", "rampura", "malibagh",
  "jatrabari", "farmgate", "lalbagh", "old dhaka", "wari", "tejgaon",
  "mohakhali", "shahbagh", "baridhara", "paltan", "shantinagar",
  "segunbagicha", "azimpur", "hazaribagh", "nikunja", "khilkhet",
  "shyamoli", "kalyanpur", "adabor", "shewrapara", "kazipara", "pallabi",
  "cantonment", "moghbazar", "eskaton", "kakrail", "bijoynagar", "purana paltan",
  "sutrapur", "kotwali", "chawkbazar", "banshree", "banasree", "aftabnagar",
  "aftab nagar", "niketan", "dakkhinkhan", "uttarkhan", "turag",
  "ধানমন্ডি", "গুলশান", "বনানী", "উত্তরা", "মিরপুর", "মোহাম্মদপুর", "বাড্ডা",
  "খিলগাঁও", "মতিঝিল", "বসুন্ধরা", "রামপুরা", "মালিবাগ", "যাত্রাবাড়ী", "ফার্মগেট"
];

/**
 * Intelligently detect District, Thana / Police Station, and Zip code from an address string
 */
export function detectLocationFromAddress(addressText: string): DetectedLocation {
  if (!addressText || !addressText.trim()) {
    const defaultDhaka = BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === "dhaka") || null;
    return {
      district: "Dhaka",
      thana: "Dhanmondi",
      postalCode: "",
      isDhaka: true,
      isSuburbs: false,
      zoneType: "inside_dhaka",
      matchedLocation: defaultDhaka,
      formattedLocation: "Dhaka → Dhanmondi (Inside Dhaka)",
    };
  }

  const normalized = normalizeBengaliDigits(addressText.toLowerCase());

  // 1. Extract 4-digit postal code if present (e.g. 1205, 1230, 4000, 3100)
  let postalCode = "";
  const zipMatch = normalized.match(/(?:post(?:al)?\s*(?:code)?|zip\s*(?:code)?|ডাকঘর|কোড|pin)?[:\s-]*(\b\d{4}\b)/i);
  if (zipMatch) {
    const val = parseInt(zipMatch[1], 10);
    if (val >= 1000 && val <= 9999) {
      postalCode = zipMatch[1];
    }
  }

  // 2. Identify District
  let matchedDistrictName = "";
  let matchedLocation: CourierLocation | null = null;

  // Check aliases first for high-accuracy matches
  for (const [canonicalDistrict, aliases] of Object.entries(DISTRICT_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a))) {
      matchedDistrictName = canonicalDistrict;
      matchedLocation = BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === canonicalDistrict.toLowerCase()) || null;
      break;
    }
  }

  // If alias didn't match, check canonical district names in the database
  if (!matchedLocation) {
    for (const loc of BD_COURIER_LOCATIONS) {
      const distLower = loc.district.toLowerCase();
      if (normalized.includes(distLower)) {
        matchedDistrictName = loc.district;
        matchedLocation = loc;
        break;
      }
    }
  }

  // 3. Identify Thana / Police Station / Upazila
  let matchedThanaName = "";

  if (matchedLocation) {
    for (const t of matchedLocation.thanas) {
      const tLower = t.toLowerCase();
      if (normalized.includes(tLower)) {
        matchedThanaName = t;
        break;
      }
    }
  } else {
    // Search across all thanas globally to infer district
    for (const loc of BD_COURIER_LOCATIONS) {
      for (const t of loc.thanas) {
        const tLower = t.toLowerCase();
        if (tLower.length >= 4 && normalized.includes(tLower)) {
          matchedDistrictName = loc.district;
          matchedThanaName = t;
          matchedLocation = loc;
          break;
        }
      }
      if (matchedLocation) break;
    }
  }

  // 4. Default fallbacks if not explicitly found
  if (!matchedDistrictName) {
    // Check if it has any Dhaka metro keywords
    if (DHAKA_METRO_KEYWORDS.some((kw) => normalized.includes(kw))) {
      matchedDistrictName = "Dhaka";
      matchedLocation = BD_COURIER_LOCATIONS.find((l) => l.district === "Dhaka") || null;
    } else if (SUBURB_KEYWORDS.some((kw) => normalized.includes(kw))) {
      matchedDistrictName = "Gazipur";
      matchedLocation = BD_COURIER_LOCATIONS.find((l) => l.district === "Gazipur") || null;
    } else {
      matchedDistrictName = "Dhaka";
      matchedLocation = BD_COURIER_LOCATIONS.find((l) => l.district === "Dhaka") || null;
    }
  }

  if (!matchedThanaName) {
    if (matchedLocation && matchedLocation.thanas.length > 0) {
      matchedThanaName = matchedLocation.thanas[0];
    } else {
      matchedThanaName = "Sadar";
    }
  }

  // 5. Determine zone type & suburb status
  const isDhakaDistrict = matchedDistrictName.toLowerCase() === "dhaka";
  const isSuburbMatch = SUBURB_KEYWORDS.some((kw) => normalized.includes(kw)) ||
    (matchedLocation ? matchedLocation.isSuburbs : false) ||
    ["savar", "dhamrai", "keraniganj", "tongi", "ashulia", "gazipur", "narayanganj"].some((s) => normalized.includes(s));

  let zoneType: DetectedLocation["zoneType"] = "outside_dhaka_sadar";

  if (isSuburbMatch) {
    zoneType = "suburbs";
  } else if (isDhakaDistrict || DHAKA_METRO_KEYWORDS.some((kw) => normalized.includes(kw))) {
    zoneType = "inside_dhaka";
  } else if (matchedThanaName.toLowerCase().includes("sadar") || matchedThanaName.toLowerCase().includes("kotwali")) {
    zoneType = "outside_dhaka_sadar";
  } else {
    zoneType = "outside_dhaka_upazila";
  }

  const formattedLocation = `${matchedDistrictName} → ${matchedThanaName} (${
    zoneType === "inside_dhaka"
      ? "Inside Dhaka"
      : zoneType === "suburbs"
      ? "Suburbs"
      : zoneType === "outside_dhaka_sadar"
      ? "Outside Dhaka Sadar"
      : "Outside Dhaka Upazila"
  })`;

  return {
    district: matchedDistrictName,
    thana: matchedThanaName,
    postalCode,
    isDhaka: isDhakaDistrict,
    isSuburbs: isSuburbMatch,
    zoneType,
    matchedLocation,
    formattedLocation,
  };
}

/**
 * Smart Chat & Message Parser
 * Automatically extracts customer name, phone number, email, address, district,
 * thana, postal code, and special instructions from pasted chats (WhatsApp, FB Page, TikTok, Instagram, SMS).
 */
export function parseChatForCustomerInfo(rawText: string): ParsedCustomerInfo {
  const result: ParsedCustomerInfo = {
    name: "",
    phone: "",
    email: "",
    fullAddress: "",
    district: "Dhaka",
    thana: "Dhanmondi",
    postalCode: "",
    notes: "",
    confidenceScore: 0,
    matchedFields: [],
  };

  if (!rawText || !rawText.trim()) return result;

  const normalizedText = normalizeBengaliDigits(rawText.trim());
  const lines = normalizedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // ── 1. Extract Phone Number (BD Format: 013, 014, 015, 016, 017, 018, 019) ──
  // Regex matches +8801XXXXXXXXX, 8801XXXXXXXXX, 01XXXXXXXXX with optional hyphens/spaces
  const phoneRegex = /(?:\+?880?|880?)?(01[3-9](?:[\s-]?\d){8})\b/;
  const phoneMatch = normalizedText.match(phoneRegex);
  if (phoneMatch) {
    const rawDigits = phoneMatch[1].replace(/[\s-]/g, "");
    if (rawDigits.length === 11 && rawDigits.startsWith("01")) {
      result.phone = rawDigits;
      result.matchedFields.push("phone");
    }
  }

  // ── 2. Extract Email Address ──
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailMatch = rawText.match(emailRegex);
  if (emailMatch) {
    result.email = emailMatch[0].toLowerCase();
    result.matchedFields.push("email");
  }

  // ── 3. Detect Source if mentioned in chat headers ──
  const lowerAll = rawText.toLowerCase();
  if (lowerAll.includes("whatsapp") || lowerAll.includes("wa.me")) result.detectedSource = "whatsapp";
  else if (lowerAll.includes("facebook") || lowerAll.includes("fb.me") || lowerAll.includes("page")) result.detectedSource = "page";
  else if (lowerAll.includes("tiktok") || lowerAll.includes("tik tok")) result.detectedSource = "tiktok";
  else if (lowerAll.includes("instagram") || lowerAll.includes("insta") || lowerAll.includes("ig")) result.detectedSource = "instagram";

  // ── 4. Extract Name, Address, and Notes from labeled or unstructured lines ──
  let extractedName = "";
  let extractedAddressParts: string[] = [];
  let extractedNotesParts: string[] = [];

  const namePrefixRegex = /^(?:name|customer|client|buyer|recipient|নাম|গ্রাহক|ক্রেতার\s*নাম|কাস্টমার)[\s:：=-]+(.*)$/i;
  const phonePrefixRegex = /^(?:phone|mobile|contact|cell|tel|phone\s*no|মোবাইল|ফোন|নাম্বার|নম্বর)[\s:：=-]+(.*)$/i;
  const emailPrefixRegex = /^(?:email|e-mail|ইমেইল)[\s:：=-]+(.*)$/i;
  const addressPrefixRegex = /^(?:address|location|delivery\s*address|shipping\s*address|ঠিকানা|এড্রেস|বাসা|ডেলিভারি\s*ঠিকানা)[\s:：=-]+(.*)$/i;
  const notesPrefixRegex = /^(?:note|notes|instruction|special\s*note|মন্তব্য|নোট)[\s:：=-]+(.*)$/i;

  let inAddressSection = false;

  for (const line of lines) {
    // Check for explicit labels
    const nameMatch = line.match(namePrefixRegex);
    const phoneLabelMatch = line.match(phonePrefixRegex);
    const emailLabelMatch = line.match(emailPrefixRegex);
    const addrLabelMatch = line.match(addressPrefixRegex);
    const notesLabelMatch = line.match(notesPrefixRegex);

    if (nameMatch) {
      extractedName = nameMatch[1].trim();
      inAddressSection = false;
      continue;
    }

    if (phoneLabelMatch) {
      const p = phoneLabelMatch[1].replace(/[^0-9]/g, "");
      if (p.length >= 11 && !result.phone) {
        result.phone = p.slice(-11);
        if (!result.matchedFields.includes("phone")) result.matchedFields.push("phone");
      }
      inAddressSection = false;
      continue;
    }

    if (emailLabelMatch) {
      if (!result.email) {
        result.email = emailLabelMatch[1].trim().toLowerCase();
        if (!result.matchedFields.includes("email")) result.matchedFields.push("email");
      }
      inAddressSection = false;
      continue;
    }

    if (addrLabelMatch) {
      extractedAddressParts.push(addrLabelMatch[1].trim());
      inAddressSection = true;
      continue;
    }

    if (notesLabelMatch) {
      extractedNotesParts.push(notesLabelMatch[1].trim());
      inAddressSection = false;
      continue;
    }

    // Unlabeled lines handling:
    // If line is just a phone number, skip
    if (line.replace(/[\s-+()]/g, "").match(/^8801[3-9]\d{8}$|^01[3-9]\d{8}$/)) {
      continue;
    }

    // If line has email, skip
    if (line.match(emailRegex) && line.length < 50) {
      continue;
    }

    // If in address section, append lines
    if (inAddressSection) {
      extractedAddressParts.push(line);
      continue;
    }

    // First non-labeled short line could be Name if we don't have one yet
    if (!extractedName && line.length > 2 && line.length < 40 && !line.includes("http") && !/\d{5,}/.test(line)) {
      // Check if it's not a common greeting
      if (!/^(hi|hello|salam|assalamu\s*alaikum|hey|ভাই|আপু)/i.test(line)) {
        extractedName = line;
        continue;
      }
    }

    // Check if line looks like an address (contains road, house, sector, district, or thana keywords)
    const hasAddressKeywords = /(?:house|road|flat|sector|block|lane|avenue|ward|thana|district|bazar|chowrasta|mor|বাড়ী|রোড|সেক্টর|ব্লক|মহল্লা|গ্রাম|থানা|জেলা)/i.test(line);
    if (hasAddressKeywords) {
      extractedAddressParts.push(line);
      continue;
    }

    // Check for note / delivery instruction keywords
    const hasNoteKeywords = /(?:deliver|delivery|urgent|evening|morning|cash|call|বিকাশ|জরুরি|ডেলিভারি|কল)/i.test(line);
    if (hasNoteKeywords) {
      extractedNotesParts.push(line);
    } else if (extractedAddressParts.length > 0) {
      // Continuation of address
      extractedAddressParts.push(line);
    }
  }

  // ── Clean and sanitize Extracted Name ──
  if (extractedName) {
    result.name = extractedName
      .replace(/^(name|নাম|customer|গ্রাহক)[\s:=-]*/i, "")
      .replace(/[|•,]/g, "")
      .trim();
    if (result.name) result.matchedFields.push("name");
  }

  // ── Build Full Address String ──
  const fullAddress = extractedAddressParts.join(", ").replace(/\s+/g, " ").trim();
  result.fullAddress = fullAddress;
  if (fullAddress) result.matchedFields.push("address");

  // ── Auto-Detect Location (District, Thana, Postal Code, Zone) from Address / Text ──
  const locationText = fullAddress || normalizedText;
  const detectedLocation = detectLocationFromAddress(locationText);

  result.district = detectedLocation.district;
  result.thana = detectedLocation.thana;
  result.postalCode = detectedLocation.postalCode;
  result.detectedZone = detectedLocation.formattedLocation;
  if (detectedLocation.district) result.matchedFields.push("district");
  if (detectedLocation.thana) result.matchedFields.push("thana");
  if (detectedLocation.postalCode) result.matchedFields.push("postalCode");

  // ── Notes ──
  if (extractedNotesParts.length > 0) {
    result.notes = extractedNotesParts.join(". ").trim();
    result.matchedFields.push("notes");
  }

  // ── Calculate Confidence Score ──
  let score = 0;
  if (result.name) score += 30;
  if (result.phone) score += 35;
  if (result.fullAddress) score += 20;
  if (result.district) score += 10;
  if (result.email) score += 5;
  result.confidenceScore = Math.min(100, score);

  return result;
}
