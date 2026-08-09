export type CourierLocation = {
  district: string;
  thanas: string[];
  isDhaka: boolean;
  isSuburbs: boolean;
  hasPickupPoint?: boolean;
  hubName?: string;
  codAvailable: boolean;
};

// Comprehensive Bangladesh Districts & Thanas dataset matching Steadfast & Pathao APIs
export const BD_COURIER_LOCATIONS: CourierLocation[] = [
  {
    district: "Dhaka",
    isDhaka: true,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Steadfast Central Hub / Pathao Dhanmondi Hub",
    thanas: [
      "Dhanmondi", "Mirpur", "Uttara", "Gulshan", "Banani", "Mohammadpur",
      "Badda", "Tejgaon", "Khilgaon", "Jatrabari", "Lalbagh", "Ramna",
      "Shahbagh", "Paltan", "Motijheel", "Basundhara", "New Market", "Sutrapur",
      "Demra", "Cantonment", "Kafrul", "Khilkhet", "Turag", "Vatara", "Rampura",
      "Hazaribagh", "Bangshal", "Kamrangirchar", "Chawkbazar", "Gendaria"
    ],
  },
  {
    district: "Dhaka Suburbs (Gazipur, Savar, Narayanganj)",
    isDhaka: false,
    isSuburbs: true,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Suburban Express Hub",
    thanas: [
      "Savar", "Ashulia", "Dhamrai", "Keraniganj", "Nawabganj", "Dohar",
      "Gazipur Sadar", "Tongi", "Kaliakair", "Kapasia", "Sreepur",
      "Narayanganj Sadar", "Siddhirganj", "Fatullah", "Bandar", "Araihazar", "Sonargaon"
    ],
  },
  {
    district: "Chattogram",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Steadfast Chattogram Regional Hub",
    thanas: [
      "Agrabad", "Kotwali", "Panchlaish", "Halishahar", "Pahartali", "Double Mooring",
      "Khulshi", "Bayezid", "Chawkbazar", "Patenga", "Chandgaon", "Bandar",
      "Hathazari", "Patiya", "Sitakunda", "Anwara", "Rangunia", "Boalkhali"
    ],
  },
  {
    district: "Gazipur",
    isDhaka: false,
    isSuburbs: true,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Gazipur Sadar Point",
    thanas: ["Gazipur Sadar", "Tongi", "Kaliakair", "Kapasia", "Sreepur", "Kaliganj"],
  },
  {
    district: "Narayanganj",
    isDhaka: false,
    isSuburbs: true,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Narayanganj City Hub",
    thanas: ["Narayanganj Sadar", "Siddhirganj", "Fatullah", "Bandar", "Araihazar", "Sonargaon", "Rupganj"],
  },
  {
    district: "Sylhet",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Sylhet Zindabazar Hub",
    thanas: ["Sylhet Sadar", "Zindabazar", "Shahparan", "South Surma", "Beanibazar", "Golapganj", "Sreemangal"],
  },
  {
    district: "Rajshahi",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Rajshahi City Point",
    thanas: ["Boalia", "Rajpara", "Motihar", "Shah Makhdum", "Paba", "Godagari"],
  },
  {
    district: "Khulna",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Khulna KDA Hub",
    thanas: ["Sonadanga", "Khulna Sadar", "Khalishpur", "Daulatpur", "Khan Jahan Ali"],
  },
  {
    district: "Barishal",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Barishal Sadar Point",
    thanas: ["Barishal Sadar", "Kotwali", "Gournadi", "Bakerganj"],
  },
  {
    district: "Rangpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Rangpur City Hub",
    thanas: ["Rangpur Sadar", "Kotwali", "Mithapukur", "Pirganj"],
  },
  {
    district: "Mymensingh",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Mymensingh Town Hub",
    thanas: ["Mymensingh Sadar", "Kotwali", "Muktagachha", "Bhaluka", "Gafargaon"],
  },
  {
    district: "Cumilla",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Cumilla Kandirpar Point",
    thanas: ["Cumilla Sadar", "Kandirpar", "Chouddagram", "Daudkandi", "Laksham"],
  },
  {
    district: "Bogura",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Bogura Saatmatha Hub",
    thanas: ["Bogura Sadar", "Saatmatha", "Shajahanpur", "Sherpur", "Ghabtali"],
  },
  {
    district: "Cox's Bazar",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Cox's Bazar Sea Beach Hub",
    thanas: ["Cox's Bazar Sadar", "Teknaf", "Ukhia", "Ramu", "Chakaria"],
  },
  {
    district: "Feni",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: false,
    thanas: ["Feni Sadar", "Daganbhuiyan", "Chhagalnaiya", "Parshuram"],
  },
  {
    district: "Noakhali",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: false,
    thanas: ["Noakhali Sadar", "Maijdee", "Begumganj", "Chowmuhani", "Senbagh"],
  },
  {
    district: "Jashore",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: false,
    thanas: ["Jashore Sadar", "Abhaynagar", "Jhikargachha", "Keshabpur"],
  },
];

/**
 * Calculates dynamic delivery charge based on courier partner, destination, and package details.
 */
export function calculateCourierRate({
  district,
  thana,
  defaultPartner = "steadfast",
  itemSubtotal = 0,
}: {
  district?: string;
  thana?: string;
  defaultPartner?: string;
  itemSubtotal?: number;
}): {
  price: number;
  deliveryDays: string;
  zoneType: "inside_dhaka" | "suburbs" | "outside_dhaka";
  codAvailable: boolean;
  pickupPoint?: string | null;
  courierName: string;
} {
  const distClean = (district || "Dhaka").toLowerCase().trim();
  const thanaClean = (thana || "").toLowerCase().trim();

  const isInsideDhaka = distClean.includes("dhaka") && !distClean.includes("suburb") && !["savar", "ashulia", "dhamrai", "keraniganj", "gazipur", "narayanganj", "tongi"].some(sub => thanaClean.includes(sub));
  const isSuburb = distClean.includes("suburb") || distClean.includes("gazipur") || distClean.includes("narayanganj") || ["savar", "ashulia", "dhamrai", "keraniganj", "tongi", "kaliakair", "fatullah", "siddhirganj"].some(sub => thanaClean.includes(sub));

  let price = 130;
  let deliveryDays = "2-4 Business Days";
  let zoneType: "inside_dhaka" | "suburbs" | "outside_dhaka" = "outside_dhaka";

  if (isInsideDhaka) {
    price = 60;
    deliveryDays = "24-48 Hours";
    zoneType = "inside_dhaka";
  } else if (isSuburb) {
    price = 100;
    deliveryDays = "1-3 Business Days";
    zoneType = "suburbs";
  }

  // Find match in dataset for pickup point info
  const match = BD_COURIER_LOCATIONS.find(
    (l) => l.district.toLowerCase() === distClean || distClean.includes(l.district.toLowerCase())
  );

  const courierName = defaultPartner === "pathao"
    ? "Pathao Courier"
    : defaultPartner === "self"
      ? "Orizino Store Express"
      : "Steadfast Courier";

  return {
    price,
    deliveryDays,
    zoneType,
    codAvailable: match ? match.codAvailable : true,
    pickupPoint: match?.hasPickupPoint ? match.hubName : null,
    courierName,
  };
}
