export type CourierLocation = {
  district: string;
  thanas: string[];
  isDhaka: boolean;
  isSuburbs: boolean;
  hasPickupPoint?: boolean;
  hubName?: string;
  codAvailable: boolean;
};

// Comprehensive Bangladesh 64 Districts & Police Stations (Thanas) matching Steadfast & Pathao APIs
export const BD_COURIER_LOCATIONS: CourierLocation[] = [
  {
    district: "Bagerhat",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Bagerhat Sadar Hub",
    thanas: [
      "Bagerhat Sadar",
      "Chitalmari",
      "Fakirhat",
      "Kachua",
      "Mollahat",
      "Mongla",
      "Morrelganj",
      "Rampal",
      "Sarankhola",
    ],
  },
  {
    district: "Bandarban",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Bandarban Sadar Hub",
    thanas: [
      "Alikadam",
      "Bandarban Sadar",
      "Lama",
      "Naikhongchhari",
      "Rowangchhari",
      "Ruma",
      "Thanchi",
    ],
  },
  {
    district: "Barguna",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Barguna Sadar Hub",
    thanas: [
      "Amtali",
      "Bamna",
      "Barguna Sadar",
      "Betagi",
      "Patharghata",
      "Taltali",
    ],
  },
  {
    district: "Barishal",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Barishal Sadar Point",
    thanas: [
      "Agailjhara",
      "Airport",
      "Babuganj",
      "Bakerganj",
      "Banaripara",
      "Barishal Sadar",
      "Gaurnadi",
      "Hizla",
      "Kawnia",
      "Kotwali",
      "Mehendiganj",
      "Muladi",
      "Wazirpur",
    ],
  },
  {
    district: "Bhola",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Bhola Sadar Hub",
    thanas: [
      "Bhola Sadar",
      "Burhanuddin",
      "Char Fasson",
      "Daulatkhan",
      "Dularhat",
      "Lalmohan",
      "Manpura",
      "Tazumuddin",
    ],
  },
  {
    district: "Bogura",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Bogura Saatmatha Hub",
    thanas: [
      "Adamdighi",
      "Bogura Sadar",
      "Dhunat",
      "Dupchanchia",
      "Gabtali",
      "Kahaloo",
      "Nandigram",
      "Saatmatha",
      "Sariakandi",
      "Shajahanpur",
      "Sherpur",
      "Shibganj",
      "Sonatala",
    ],
  },
  {
    district: "Brahmanbaria",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Brahmanbaria Sadar Hub",
    thanas: [
      "Akhaura",
      "Ashuganj",
      "Bancharampur",
      "Bijoynagar",
      "Brahmanbaria Sadar",
      "Kasba",
      "Nabinagar",
      "Nasirnagar",
      "Sarail",
    ],
  },
  {
    district: "Chandpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Chandpur Sadar Hub",
    thanas: [
      "Chandpur Sadar",
      "Faridganj",
      "Haimchar",
      "Haziganj",
      "Kachua",
      "Matlab North",
      "Matlab South",
      "Shahrasti",
    ],
  },
  {
    district: "Chapai Nawabganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Chapai Nawabganj Hub",
    thanas: [
      "Bholahat",
      "Chapai Nawabganj Sadar",
      "Gomastapur",
      "Nachole",
      "Shibganj",
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
      "Agrabad",
      "Akbar Shah",
      "Anwara",
      "Bakolia",
      "Bandar",
      "Banshkhali",
      "Bayezid",
      "Bhujpur",
      "Boalkhali",
      "Chandanaish",
      "Chandgaon",
      "Chawkbazar",
      "Double Mooring",
      "EPZ",
      "Fatikchhari",
      "Halishahar",
      "Hathazari",
      "Karnaphuli",
      "Khulshi",
      "Kotwali",
      "Lohagara",
      "Mirsharai",
      "Pahartali",
      "Panchlaish",
      "Patenga",
      "Patiya",
      "Rangunia",
      "Raozan",
      "Sadarghat",
      "Sandwip",
      "Satkania",
      "Sitakunda",
      "Zorargonj",
    ],
  },
  {
    district: "Chuadanga",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Chuadanga Sadar Hub",
    thanas: [
      "Alamdanga",
      "Chuadanga Sadar",
      "Damurhuda",
      "Darshana",
      "Jibannagar",
    ],
  },
  {
    district: "Cox's Bazar",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Cox's Bazar Sea Beach Hub",
    thanas: [
      "Chakaria",
      "Cox's Bazar Sadar",
      "Eidgaon",
      "Kutubdia",
      "Maheshkhali",
      "Pekua",
      "Ramu",
      "Teknaf",
      "Ukhia",
    ],
  },
  {
    district: "Cumilla",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Cumilla Kandirpar Hub",
    thanas: [
      "Barura",
      "Brahmanpara",
      "Burichang",
      "Chandina",
      "Chauddagram",
      "Cumilla Sadar",
      "Daudkandi",
      "Debidwar",
      "Homna",
      "Kandirpar",
      "Kotwali",
      "Laksam",
      "Lalmai",
      "Meghna",
      "Monohargonj",
      "Muradnagar",
      "Nangalkot",
      "Sadar South",
      "Titas",
    ],
  },
  {
    district: "Dhaka",
    isDhaka: true,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Steadfast Central Hub / Pathao Dhanmondi Hub",
    thanas: [
      "Adabor",
      "Badda",
      "Banani",
      "Bangshal",
      "Basundhara",
      "Bhatara",
      "Cantonment",
      "Chawkbazar",
      "Darus Salam",
      "Demra",
      "Dhanmondi",
      "Gendaria",
      "Gulshan",
      "Hatirjheel",
      "Hazaribagh",
      "Jatrabari",
      "Kadamtali",
      "Kafrul",
      "Kalabagan",
      "Kamrangirchar",
      "Khilgaon",
      "Khilkhet",
      "Kotwali",
      "Lalbagh",
      "Mirpur",
      "Mohammadpur",
      "Motijheel",
      "Mugda",
      "New Market",
      "Pallabi",
      "Paltan",
      "Ramna",
      "Rampura",
      "Rupnagar",
      "Sabujbagh",
      "Shah Ali",
      "Shahbagh",
      "Sher-e-Bangla Nagar",
      "Shyampur",
      "Sutrapur",
      "Tejgaon",
      "Turag",
      "Uttara",
      "Vatara",
      "Wari",
    ],
  },
  {
    district: "Dhaka Sub-Urban",
    isDhaka: false,
    isSuburbs: true,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Suburban Express Hub",
    thanas: [
      "Ashulia",
      "Dhamrai",
      "Dohar",
      "Keraniganj",
      "Nawabganj",
      "Savar",
    ],
  },
  {
    district: "Dinajpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Dinajpur Sadar Hub",
    thanas: [
      "Birampur",
      "Birganj",
      "Birol",
      "Bochaganj",
      "Chirirbandar",
      "Dinajpur Sadar",
      "Fulbari",
      "Ghoraghat",
      "Hakimpur",
      "Hili",
      "Kaharole",
      "Khansama",
      "Kotwali",
      "Nawabganj",
      "Parbatipur",
    ],
  },
  {
    district: "Faridpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Faridpur Sadar Hub",
    thanas: [
      "Alfadanga",
      "Bhanga",
      "Boalmari",
      "Charbhadrasan",
      "Faridpur Sadar",
      "Kotwali",
      "Madhukhali",
      "Nagarkanda",
      "Sadarpur",
      "Saltha",
    ],
  },
  {
    district: "Feni",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Feni Sadar Hub",
    thanas: [
      "Chhagalnaiya",
      "Daganbhuiyan",
      "Feni Sadar",
      "Fulgazi",
      "Parshuram",
      "Sonagazi",
    ],
  },
  {
    district: "Gaibandha",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Gaibandha Sadar Hub",
    thanas: [
      "Fulchhari",
      "Gaibandha Sadar",
      "Gobindaganj",
      "Palashbari",
      "Sadullapur",
      "Sughatta",
      "Sundarganj",
    ],
  },
  {
    district: "Gazipur",
    isDhaka: false,
    isSuburbs: true,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Gazipur Sadar Hub",
    thanas: [
      "Board Bazar",
      "Gacha",
      "Gazipur Sadar",
      "Joydebpur",
      "Kaliakair",
      "Kaliganj",
      "Kapasia",
      "Kashimpur",
      "Konabari",
      "Pubail",
      "Sreepur",
      "Tongi",
    ],
  },
  {
    district: "Gopalganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Gopalganj Sadar Hub",
    thanas: [
      "Gopalganj Sadar",
      "Kashiani",
      "Kotalipara",
      "Muksudpur",
      "Tungipara",
    ],
  },
  {
    district: "Habiganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Habiganj Sadar Hub",
    thanas: [
      "Ajmiriganj",
      "Bahubal",
      "Baniyachong",
      "Chunarughat",
      "Habiganj Sadar",
      "Lakhai",
      "Madhabpur",
      "Nabiganj",
      "Sayestaganj",
    ],
  },
  {
    district: "Jamalpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Jamalpur Sadar Hub",
    thanas: [
      "Bakshiganj",
      "Dewanganj",
      "Islampur",
      "Jamalpur Sadar",
      "Madarganj",
      "Melandaha",
      "Sarishabari",
    ],
  },
  {
    district: "Jashore",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Jashore Sadar Hub",
    thanas: [
      "Abhaynagar",
      "Bagherpara",
      "Benapole",
      "Chaugachha",
      "Jashore Sadar",
      "Jhikargachha",
      "Keshabpur",
      "Kotwali",
      "Manirampur",
      "Sharsha",
    ],
  },
  {
    district: "Jhalokati",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Jhalokati Sadar Hub",
    thanas: [
      "Jhalokati Sadar",
      "Kathalia",
      "Nalchity",
      "Rajapur",
    ],
  },
  {
    district: "Jhenaidah",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Jhenaidah Sadar Hub",
    thanas: [
      "Harinakundu",
      "Jhenaidah Sadar",
      "Kaliganj",
      "Kotchandpur",
      "Maheshpur",
      "Shailkupa",
    ],
  },
  {
    district: "Joypurhat",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Joypurhat Sadar Hub",
    thanas: [
      "Akkelpur",
      "Joypurhat Sadar",
      "Kalai",
      "Khetlal",
      "Panchbibi",
    ],
  },
  {
    district: "Khagrachhari",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Khagrachhari Sadar Hub",
    thanas: [
      "Dighinala",
      "Guimara",
      "Khagrachhari Sadar",
      "Lakshmichhari",
      "Mahalchhari",
      "Manikchhari",
      "Matiranga",
      "Panchhari",
      "Ramgarh",
    ],
  },
  {
    district: "Khulna",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Khulna KDA Hub",
    thanas: [
      "Aranghata",
      "Batiaghata",
      "Dacope",
      "Daulatpur",
      "Dighalia",
      "Dumuria",
      "Harintana",
      "Khalishpur",
      "Khan Jahan Ali",
      "Khulna Sadar",
      "Koyra",
      "Paikgachha",
      "Phultala",
      "Rupsha",
      "Sonadanga",
      "Terokhada",
    ],
  },
  {
    district: "Kishoreganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Kishoreganj Sadar Hub",
    thanas: [
      "Ashtagram",
      "Bajitpur",
      "Bhairab",
      "Hossainpur",
      "Itna",
      "Karimganj",
      "Katiadi",
      "Kishoreganj Sadar",
      "Kuliarchar",
      "Mithamoin",
      "Nikli",
      "Pakundia",
      "Tarail",
    ],
  },
  {
    district: "Kurigram",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Kurigram Sadar Hub",
    thanas: [
      "Bhurungamari",
      "Char Rajibpur",
      "Chilmari",
      "Kachakata",
      "Kurigram Sadar",
      "Nageshwari",
      "Phulbari",
      "Rajarhat",
      "Routhmari",
      "Ulipur",
    ],
  },
  {
    district: "Kushtia",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Kushtia Sadar Hub",
    thanas: [
      "Bheramara",
      "Daulatpur",
      "Islamic University",
      "Khoksa",
      "Kumarkhali",
      "Kushtia Sadar",
      "Mirpur",
      "Poradah",
    ],
  },
  {
    district: "Lakshmipur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Lakshmipur Sadar Hub",
    thanas: [
      "Kamalnagar",
      "Lakshmipur Sadar",
      "Raipur",
      "Ramganj",
      "Ramgati",
    ],
  },
  {
    district: "Lalmonirhat",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Lalmonirhat Sadar Hub",
    thanas: [
      "Aditmari",
      "Burimari",
      "Hatibandha",
      "Kaliganj",
      "Lalmonirhat Sadar",
      "Patgram",
    ],
  },
  {
    district: "Madaripur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Madaripur Sadar Hub",
    thanas: [
      "Dasar",
      "Kalkini",
      "Madaripur Sadar",
      "Rajoir",
      "Shibchar",
    ],
  },
  {
    district: "Magura",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Magura Sadar Hub",
    thanas: [
      "Magura Sadar",
      "Mohammadpur",
      "Shalikha",
      "Sreepur",
    ],
  },
  {
    district: "Manikganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Manikganj Sadar Hub",
    thanas: [
      "Daulatpur",
      "Ghior",
      "Harirampur",
      "Manikganj Sadar",
      "Saturia",
      "Shibalaya",
      "Singair",
    ],
  },
  {
    district: "Meherpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Meherpur Sadar Hub",
    thanas: [
      "Gangni",
      "Meherpur Sadar",
      "Mujibnagar",
    ],
  },
  {
    district: "Moulvibazar",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Moulvibazar Sadar Hub",
    thanas: [
      "Barlekha",
      "Juri",
      "Kamalganj",
      "Kulaura",
      "Moulvibazar Sadar",
      "Rajnagar",
      "Sreemangal",
    ],
  },
  {
    district: "Munshiganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Munshiganj Sadar Hub",
    thanas: [
      "Gazaria",
      "Louhajang",
      "Munshiganj Sadar",
      "Sirajdikhan",
      "Sreenagar",
      "Tongibari",
    ],
  },
  {
    district: "Mymensingh",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Mymensingh Town Hub",
    thanas: [
      "Bhaluka",
      "Dhobaura",
      "Fulbaria",
      "Gaffargaon",
      "Gauripur",
      "Haluaghat",
      "Ishwarganj",
      "Kotwali",
      "Muktagachha",
      "Mymensingh Sadar",
      "Nandail",
      "Phulpur",
      "Tara Khanda",
    ],
  },
  {
    district: "Naogaon",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Naogaon Sadar Hub",
    thanas: [
      "Atrai",
      "Badalgachhi",
      "Dhamoirhat",
      "Manda",
      "Mohadevpur",
      "Naogaon Sadar",
      "Niamatpur",
      "Patnitala",
      "Porsha",
      "Raninagar",
      "Sapahar",
    ],
  },
  {
    district: "Narail",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Narail Sadar Hub",
    thanas: [
      "Kalia",
      "Lohagara",
      "Naragati",
      "Narail Sadar",
    ],
  },
  {
    district: "Narayanganj",
    isDhaka: false,
    isSuburbs: true,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Narayanganj City Hub",
    thanas: [
      "Adamjee",
      "Araihazar",
      "Bandar",
      "Fatullah",
      "Kanchpur",
      "Narayanganj Sadar",
      "Rupganj",
      "Siddhirganj",
      "Sonargaon",
    ],
  },
  {
    district: "Narsingdi",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Narsingdi Sadar Hub",
    thanas: [
      "Belabo",
      "Madhabdi",
      "Monohardi",
      "Narsingdi Sadar",
      "Palash",
      "Raipura",
      "Shibpur",
    ],
  },
  {
    district: "Natore",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Natore Sadar Hub",
    thanas: [
      "Bagatipara",
      "Baraigram",
      "Gurudaspur",
      "Lalpur",
      "Naldanga",
      "Natore Sadar",
      "Singra",
    ],
  },
  {
    district: "Netrokona",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Netrokona Sadar Hub",
    thanas: [
      "Atpara",
      "Barhatta",
      "Durgapur",
      "Kalmakanda",
      "Kendua",
      "Khaliajuri",
      "Madan",
      "Mohanganj",
      "Netrokona Sadar",
      "Purbadhala",
    ],
  },
  {
    district: "Nilphamari",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Nilphamari Sadar Hub",
    thanas: [
      "Dimla",
      "Domar",
      "Jaldhaka",
      "Kishoreganj",
      "Nilphamari Sadar",
      "Saidpur",
    ],
  },
  {
    district: "Noakhali",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Noakhali Maijdee Hub",
    thanas: [
      "Begumganj",
      "Chatkhil",
      "Chowmuhani",
      "Companiganj",
      "Hatiya",
      "Kabirhat",
      "Maijdee",
      "Noakhali Sadar",
      "Senbagh",
      "Sonaimuri",
      "Subarnachar",
    ],
  },
  {
    district: "Pabna",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Pabna Sadar Hub",
    thanas: [
      "Atgharia",
      "Bera",
      "Bhangura",
      "Chatmohar",
      "Faridpur",
      "Ishwardi",
      "Pabna Sadar",
      "Santhia",
      "Sujanagar",
    ],
  },
  {
    district: "Panchagarh",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Panchagarh Sadar Hub",
    thanas: [
      "Atwari",
      "Boda",
      "Debiganj",
      "Panchagarh Sadar",
      "Tetulia",
    ],
  },
  {
    district: "Patuakhali",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Patuakhali Sadar Hub",
    thanas: [
      "Bauphal",
      "Dashmina",
      "Dumki",
      "Galachipa",
      "Kalapara",
      "Kuakata",
      "Mirzaganj",
      "Patuakhali Sadar",
      "Rangabali",
    ],
  },
  {
    district: "Pirojpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Pirojpur Sadar Hub",
    thanas: [
      "Bhandaria",
      "Indurkani",
      "Kawkhali",
      "Mathbaria",
      "Nazirpur",
      "Nesarabad (Swarupkati)",
      "Pirojpur Sadar",
    ],
  },
  {
    district: "Rajbari",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Rajbari Sadar Hub",
    thanas: [
      "Baliakandi",
      "Goalanda",
      "Kalukhali",
      "Pangsha",
      "Rajbari Sadar",
    ],
  },
  {
    district: "Rajshahi",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Rajshahi City Point",
    thanas: [
      "Airport",
      "Bagha",
      "Bagmara",
      "Boalia",
      "Chandrima",
      "Charghat",
      "Durgapur",
      "Godagari",
      "Kashiadanga",
      "Katakhali",
      "Mohanpur",
      "Motihar",
      "Paba",
      "Puthia",
      "Rajpara",
      "Shah Makhdum",
      "Tanore",
    ],
  },
  {
    district: "Rangamati",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Rangamati Sadar Hub",
    thanas: [
      "Baghaichhari",
      "Barkal",
      "Belaichhari",
      "Juraichhari",
      "Kaptai",
      "Kawkhali",
      "Langadu",
      "Naniarchar",
      "Rajasthali",
      "Rangamati Sadar",
    ],
  },
  {
    district: "Rangpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Rangpur City Hub",
    thanas: [
      "Badarganj",
      "Gangachhara",
      "Haragach",
      "Kaunia",
      "Kotwali",
      "Mahiganj",
      "Mithapukur",
      "Parshuram",
      "Pirgachha",
      "Pirganj",
      "Rangpur Sadar",
      "Tajhat",
      "Taraganj",
    ],
  },
  {
    district: "Satkhira",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Satkhira Sadar Hub",
    thanas: [
      "Assasuni",
      "Debhata",
      "Kalaroa",
      "Kaliganj",
      "Satkhira Sadar",
      "Shyamnagar",
      "Tala",
    ],
  },
  {
    district: "Shariatpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Shariatpur Sadar Hub",
    thanas: [
      "Bhedarganj",
      "Damudya",
      "Gosairhat",
      "Naria",
      "Shakhipur",
      "Shariatpur Sadar",
      "Zanjira",
    ],
  },
  {
    district: "Sherpur",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Sherpur Sadar Hub",
    thanas: [
      "Jhenaigati",
      "Nakla",
      "Nalitabari",
      "Sherpur Sadar",
      "Sreebardi",
    ],
  },
  {
    district: "Sirajganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Sirajganj Sadar Hub",
    thanas: [
      "Belkuchi",
      "Chauhali",
      "Kamarkhanda",
      "Kazipur",
      "Raiganj",
      "Shahjadpur",
      "Sirajganj Sadar",
      "Tarash",
      "Ullapara",
    ],
  },
  {
    district: "Sunamganj",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Sunamganj Sadar Hub",
    thanas: [
      "Bishwamvarpur",
      "Chhatak",
      "Derai",
      "Dharamapasha",
      "Dowarabazar",
      "Jagannathpur",
      "Jamalganj",
      "Madhyanagar",
      "Shanthiganj",
      "Sullah",
      "Sunamganj Sadar",
      "Tahirpur",
    ],
  },
  {
    district: "Sylhet",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Sylhet Zindabazar Hub",
    thanas: [
      "Airport",
      "Balaganj",
      "Beanibazar",
      "Bishwanath",
      "Companiganj",
      "Fenchuganj",
      "Golapganj",
      "Gowainghat",
      "Jaintiapur",
      "Jalalabad",
      "Kanaighat",
      "Kotwali",
      "Moglabazar",
      "Osmani Nagar",
      "Shahparan",
      "South Surma",
      "Sylhet Sadar",
      "Zakiganj",
      "Zindabazar",
    ],
  },
  {
    district: "Tangail",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Tangail Sadar Hub",
    thanas: [
      "Basail",
      "Bhuapur",
      "Delduar",
      "Dhanbari",
      "Ghatail",
      "Gopalpur",
      "Kalihati",
      "Madhupur",
      "Mirzapur",
      "Nagarpur",
      "Sakhipur",
      "Tangail Sadar",
    ],
  },
  {
    district: "Thakurgaon",
    isDhaka: false,
    isSuburbs: false,
    codAvailable: true,
    hasPickupPoint: true,
    hubName: "Thakurgaon Sadar Hub",
    thanas: [
      "Baliadangi",
      "Haripur",
      "Pirganj",
      "Ranisankail",
      "Ruhia",
      "Thakurgaon Sadar",
    ],
  },
];

export const BD_ALL_DISTRICTS: string[] = BD_COURIER_LOCATIONS.map((l) => l.district);

export function getThanasForDistrict(districtName: string): string[] {
  if (!districtName) return [];
  const clean = districtName.toLowerCase().trim();
  const found = BD_COURIER_LOCATIONS.find(
    (l) => l.district.toLowerCase() === clean || clean.includes(l.district.toLowerCase())
  );
  return found ? found.thanas : ["Sadar"];
}

export type ParcelCategory = "regular" | "document" | "book";
export type ServiceType = "regular" | "same_day" | "hub_pickup";

export type RouteType =
  | "intra_dhaka"
  | "intra_same_city_osd"
  | "intra_suburbs"
  | "dhaka_to_suburbs"
  | "dhaka_to_osd_sadar"
  | "dhaka_to_osd_upazila"
  | "inter_district_osd";

/**
 * Calculates dynamic delivery charge based on official Steadfast Courier Limited Tariff Matrix.
 * 
 * Comprehensive Route Matrix:
 * 1. Dhaka City -> Dhaka City: ৳70 (≤150g: ৳55, ≤500g: ৳60, ≤1kg: ৳70)
 * 2. Dhaka Sub-Urban -> Dhaka Sub-Urban: ৳60
 * 3. Within Same City Outside Dhaka (e.g. Ctg->Ctg, Sylhet->Sylhet): ৳60
 * 4. Dhaka City <-> Dhaka Sub-Urban: ৳105
 * 5. Dhaka City <-> Outside Dhaka District Sadar: ৳115
 * 6. Dhaka City <-> Outside Dhaka Upazila / Rural: ৳130
 * 7. Outside Dhaka <-> Outside Dhaka (Inter-District, e.g. Ctg->Sylhet, Rajshahi->Khulna): ৳135
 * 8. Same Day Express (Inside Dhaka / Chittagong City): ৳105
 * 9. Hub Point Delivery (Pick & Drop base): ৳80
 * 10. Book Category: ৳55 (Intra-city/Sub-Urban) / ৳95 (Inter-district)
 * 11. Document Category: ৳50 (Flat nationwide)
 * 12. Additional Weight: +৳20 per KG exceeding 1.0 KG
 * 13. 1% Cash on Delivery & Risk Management charge applies on COD amount
 */
export function calculateCourierRate({
  originDistrict = "Dhaka",
  district,
  thana,
  defaultPartner = "steadfast",
  itemSubtotal = 0,
  weightKg = 1,
  category = "regular",
  serviceType = "regular",
  insideDhakaRate = 70,
  sameCityOsdRate = 60,
  intraSuburbsRate = 60,
  suburbsRate = 105,
  outsideDhakaSadarRate = 115,
  outsideDhakaRate = 130,
  interDistrictRate = 135,
  sameDayRate = 105,
  hubPickupRate = 80,
  extraKgFee = 20,
  freeShippingThreshold = 2500,
  freeShippingEnabled = true,
  universalCodEnabled = true,
  codFee = 0,
  codPercentage = 1,
  isCod = false,
}: {
  originDistrict?: string;
  district?: string;
  thana?: string;
  defaultPartner?: string;
  itemSubtotal?: number;
  weightKg?: number;
  category?: ParcelCategory;
  serviceType?: ServiceType;
  insideDhakaRate?: number;
  sameCityOsdRate?: number;
  intraSuburbsRate?: number;
  suburbsRate?: number;
  outsideDhakaSadarRate?: number;
  outsideDhakaRate?: number;
  interDistrictRate?: number;
  sameDayRate?: number;
  hubPickupRate?: number;
  extraKgFee?: number;
  freeShippingThreshold?: number;
  freeShippingEnabled?: boolean;
  universalCodEnabled?: boolean;
  codFee?: number;
  codPercentage?: number;
  isCod?: boolean;
}): {
  price: number;
  baseZonePrice: number;
  weightSurcharge: number;
  baseDeliveryFee: number;
  effectiveDeliveryFee: number;
  appliedCodFee: number;
  isFreeQualified: boolean;
  deliveryDays: string;
  routeType: RouteType;
  zoneType: "inside_dhaka" | "suburbs" | "outside_dhaka_sadar" | "outside_dhaka" | "inter_district";
  codAvailable: boolean;
  pickupPoint?: string | null;
  courierName: string;
} {
  const origClean = (originDistrict || "Dhaka").toLowerCase().trim();
  const distClean = (district || "Dhaka").toLowerCase().trim();
  const thanaClean = (thana || "").toLowerCase().trim();

  const isOriginDhaka = origClean.includes("dhaka") && !origClean.includes("suburb") && !origClean.includes("sub-urban");
  const isOriginSuburb = origClean.includes("suburb") || origClean.includes("sub-urban") || origClean.includes("gazipur") || origClean.includes("narayanganj");

  const isDestDhaka =
    distClean.includes("dhaka") &&
    !distClean.includes("suburb") &&
    !distClean.includes("sub-urban") &&
    !["savar", "ashulia", "dhamrai", "keraniganj", "gazipur", "narayanganj", "tongi", "kaliakair", "dohar", "nawabganj"].some((sub) =>
      thanaClean.includes(sub)
    );

  const isDestSuburb =
    distClean.includes("suburb") ||
    distClean.includes("sub-urban") ||
    distClean.includes("gazipur") ||
    distClean.includes("narayanganj") ||
    ["savar", "ashulia", "dhamrai", "keraniganj", "tongi", "kaliakair", "fatullah", "siddhirganj", "dohar", "nawabganj", "sreepur", "kapasia", "sonargaon", "rupganj"].some((sub) =>
      thanaClean.includes(sub)
    );

  const isDestSadar =
    thanaClean.includes("sadar") ||
    thanaClean.includes("kotwali") ||
    thanaClean.includes("boalia") ||
    thanaClean.includes("agrabad") ||
    thanaClean.includes("panchlaish") ||
    thanaClean.includes("halishahar") ||
    thanaClean.includes("zindabazar") ||
    thanaClean.includes("saatmatha") ||
    thanaClean.includes("kandirpar") ||
    distClean === thanaClean;

  const isSameDistrict = origClean === distClean || (origClean.includes(distClean) && distClean.length > 3) || (distClean.includes(origClean) && origClean.length > 3);

  let routeType: RouteType = "dhaka_to_osd_upazila";
  let zoneType: "inside_dhaka" | "suburbs" | "outside_dhaka_sadar" | "outside_dhaka" | "inter_district" = "outside_dhaka";
  let baseZonePrice = outsideDhakaRate || 130;
  let deliveryDays = "48-72 Hours";

  // ── ROUTE DETERMINATION ──────────────────────────────────────────────────
  if (isOriginDhaka && isDestDhaka) {
    // 1. Dhaka City -> Dhaka City
    routeType = "intra_dhaka";
    zoneType = "inside_dhaka";
    deliveryDays = serviceType === "same_day" ? "5-8 Hours (Same Day)" : "24 Hours";
    
    if (category === "document") {
      baseZonePrice = 50;
    } else if (category === "book") {
      baseZonePrice = 55;
    } else if (serviceType === "same_day") {
      baseZonePrice = sameDayRate || 105;
    } else if (serviceType === "hub_pickup") {
      baseZonePrice = hubPickupRate || 80;
    } else {
      // Small parcel slab discounts inside Dhaka
      if (weightKg <= 0.15) {
        baseZonePrice = Math.min(insideDhakaRate, 55);
      } else if (weightKg <= 0.5) {
        baseZonePrice = Math.min(insideDhakaRate, 60);
      } else {
        baseZonePrice = insideDhakaRate || 70;
      }
    }
  } else if (isOriginSuburb && isDestSuburb) {
    // 2. Dhaka Sub-Urban -> Dhaka Sub-Urban
    routeType = "intra_suburbs";
    zoneType = "suburbs";
    deliveryDays = "24-48 Hours";
    baseZonePrice = category === "document" ? 50 : category === "book" ? 55 : (intraSuburbsRate || 60);
  } else if (!isOriginDhaka && !isOriginSuburb && isSameDistrict) {
    // 3. Within the Same City (Outside Dhaka) [e.g. Ctg->Ctg, Sylhet->Sylhet]
    routeType = "intra_same_city_osd";
    zoneType = "inside_dhaka"; // Local city delivery tier
    deliveryDays = serviceType === "same_day" ? "5-8 Hours (Same Day)" : "24 Hours";
    if (category === "document") {
      baseZonePrice = 50;
    } else if (category === "book") {
      baseZonePrice = 55;
    } else if (serviceType === "same_day" && (origClean.includes("chattogram") || origClean.includes("chittagong"))) {
      baseZonePrice = sameDayRate || 105;
    } else {
      baseZonePrice = sameCityOsdRate || 60; // ৳60
    }
  } else if ((isOriginDhaka && isDestSuburb) || (isOriginSuburb && isDestDhaka)) {
    // 4. Dhaka City <-> Dhaka Sub-Urban
    routeType = "dhaka_to_suburbs";
    zoneType = "suburbs";
    deliveryDays = "24-48 Hours";
    baseZonePrice = category === "document" ? 50 : category === "book" ? 95 : (suburbsRate || 105);
  } else if (isOriginDhaka && !isDestSuburb && !isDestDhaka) {
    // 5 & 6. Dhaka City -> Outside Dhaka (District Sadar vs Upazila)
    if (category === "document") {
      baseZonePrice = 50;
      deliveryDays = "48-72 Hours";
    } else if (category === "book") {
      baseZonePrice = 95;
      deliveryDays = "48-72 Hours";
    } else if (isDestSadar) {
      routeType = "dhaka_to_osd_sadar";
      zoneType = "outside_dhaka_sadar";
      baseZonePrice = outsideDhakaSadarRate || 115;
      deliveryDays = "48-72 Hours";
    } else {
      routeType = "dhaka_to_osd_upazila";
      zoneType = "outside_dhaka";
      baseZonePrice = outsideDhakaRate || 130;
      deliveryDays = "72-96 Hours";
    }
  } else {
    // 7. Outside Dhaka <-> Outside Dhaka (Inter-District, e.g. Ctg -> Sylhet, Rajshahi -> Khulna)
    routeType = "inter_district_osd";
    zoneType = "inter_district";
    deliveryDays = "72-96 Hours";
    if (category === "document") {
      baseZonePrice = 50;
    } else if (category === "book") {
      baseZonePrice = 95;
    } else {
      baseZonePrice = interDistrictRate || 135; // ৳135
    }
  }

  // Weight condition: +৳20 per additional kg exceeding 1.0 kg
  const weightNum = Math.max(1, Number(weightKg) || 1);
  const extraWeight = Math.max(0, weightNum - 1);
  const weightSurcharge = Math.ceil(extraWeight) * (Number(extraKgFee) || 20);
  const baseDeliveryFee = baseZonePrice + weightSurcharge;

  // Free shipping rule: Qualified when subtotal >= threshold
  const isFreeQualified = freeShippingEnabled && itemSubtotal >= (freeShippingThreshold || 2500);
  const effectiveDeliveryFee = isFreeQualified ? 0 : baseDeliveryFee;

  // COD fee: 1% Cash on Delivery & Risk Management charge or fixed cod fee (independent extra charge)
  let appliedCodFee = 0;
  if (universalCodEnabled && isCod) {
    const pctFee = Math.round(((Number(itemSubtotal) || 0) * (Number(codPercentage) || 1)) / 100);
    appliedCodFee = Math.max(Number(codFee) || 0, pctFee > 0 ? pctFee : 0);
  }

  const finalPrice = effectiveDeliveryFee + appliedCodFee;

  // Find match in dataset for pickup point info
  const match = BD_COURIER_LOCATIONS.find(
    (l) => l.district.toLowerCase() === distClean || distClean.includes(l.district.toLowerCase())
  );

  const courierName =
    defaultPartner === "pathao"
      ? "Pathao Courier"
      : defaultPartner === "self"
        ? "Orizino Store Express"
        : "Steadfast Courier";

  return {
    price: finalPrice,
    baseZonePrice,
    weightSurcharge,
    baseDeliveryFee,
    effectiveDeliveryFee,
    appliedCodFee,
    isFreeQualified,
    deliveryDays,
    routeType,
    zoneType,
    codAvailable: universalCodEnabled ? (match ? match.codAvailable : true) : false,
    pickupPoint: match?.hasPickupPoint ? match.hubName : null,
    courierName,
  };
}

