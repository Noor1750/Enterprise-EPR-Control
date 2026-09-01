// Bangladesh Administrative Location Master Data
// 64 Districts organized across 8 Divisions with comprehensive Police Stations / Thanas

export interface BangladeshLocationEntry {
  division: string;
  district: string;
  policeStations: string[];
}

export const BANGLADESH_LOCATIONS: BangladeshLocationEntry[] = [
  // --- DHAKA DIVISION ---
  {
    division: 'Dhaka',
    district: 'Dhaka',
    policeStations: [
      'Adabor', 'Badda', 'Bangshal', 'Bimanbandar', 'Cantonment', 'Chakbazar', 
      'Dakshinkhan', 'Darus Salam', 'Demra', 'Dhamrai', 'Dhanmondi', 'Dohar', 
      'Gandaria', 'Gulshan', 'Hazaribagh', 'Jatrabari', 'Kadamtali', 'Kafrul', 
      'Kalabagan', 'Kamrangirchar', 'Keraniganj', 'Khilgaon', 'Khilkhet', 'Kotwali', 
      'Lalbagh', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Mugda', 'Nawabganj', 
      'New Market', 'Pallabi', 'Paltan', 'Ramna', 'Rampura', 'Rupnagar', 
      'Sabujbagh', 'Savar', 'Shah Ali', 'Shahbagh', 'Sher-e-Bangla Nagar', 
      'Shyampur', 'Sutrapur', 'Tejgaon', 'Tejgaon Industrial Area', 'Turag', 
      'Uttara East', 'Uttara West', 'Uttar Khan', 'Vatara', 'Wari'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Gazipur',
    policeStations: [
      'Gazipur Sadar', 'Joydebpur', 'Tongi East', 'Tongi West', 'Gacha', 
      'Bason', 'Konabari', 'Kashimpur', 'Kaliakair', 'Kapasia', 'Sreepur', 'Kaliganj'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Narayanganj',
    policeStations: [
      'Narayanganj Sadar', 'Fatullah', 'Siddhirganj', 'Bandar', 'Araihazar', 
      'Rupganj', 'Sonargaon'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Narsingdi',
    policeStations: [
      'Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura', 'Shibpur'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Tangail',
    policeStations: [
      'Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Dhanbari', 'Ghatail', 
      'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Manikganj',
    policeStations: [
      'Manikganj Sadar', 'Daulatpur', 'Ghior', 'Harirampur', 'Saturia', 'Shibalaya', 'Singair'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Munshiganj',
    policeStations: [
      'Munshiganj Sadar', 'Gazaria', 'Lohajang', 'Sirajdikhan', 'Sreenagar', 'Tongibari'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Faridpur',
    policeStations: [
      'Faridpur Sadar', 'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 
      'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Gopalganj',
    policeStations: [
      'Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Madaripur',
    policeStations: [
      'Madaripur Sadar', 'Kalkini', 'Rajoir', 'Shibchar', 'Dasar'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Rajbari',
    policeStations: [
      'Rajbari Sadar', 'Baliakandi', 'Goalandaghat', 'Pangsha', 'Kalukhali'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Shariatpur',
    policeStations: [
      'Shariatpur Sadar', 'Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Zajira'
    ]
  },
  {
    division: 'Dhaka',
    district: 'Kishoreganj',
    policeStations: [
      'Kishoreganj Sadar', 'Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 
      'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'
    ]
  },

  // --- CHITTAGONG DIVISION ---
  {
    division: 'Chittagong',
    district: 'Chittagong (Chattogram)',
    policeStations: [
      'Kotwali', 'Panchlaish', 'Chandgaon', 'Double Mooring', 'Pahartali', 
      'Halishahar', 'Khulshi', 'Bakalia', 'Bayazid', 'Patenga', 'Karnafuli', 
      'Akbar Shah', 'Chawkbazar', 'EPZ', 'Sadarghat', 'Anwara', 'Banshkhali', 
      'Boalkhali', 'Chandanaish', 'Fatikchhari', 'Hathazari', 'Lohagara', 
      'Mirsharai', 'Patiya', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Cox\'s Bazar',
    policeStations: [
      'Cox\'s Bazar Sadar', 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Ramu', 
      'Teknaf', 'Ukhia', 'Pekua', 'Eidgaon'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Comilla (Cumilla)',
    policeStations: [
      'Kotwali Model', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 
      'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Muradnagar', 
      'Nangalkot', 'Meghna', 'Titas', 'Monohargonj', 'Sadar Dakshin', 'Lalmai'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Brahmanbaria',
    policeStations: [
      'Brahmanbaria Sadar', 'Ashuganj', 'Akhaura', 'Bancharampur', 'Bijoynagar', 
      'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Chandpur',
    policeStations: [
      'Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 
      'Matlab North', 'Matlab South', 'Shahrasti'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Feni',
    policeStations: [
      'Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Parshuram', 'Fulgazi', 'Sonagazi'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Noakhali',
    policeStations: [
      'Sudharam (Noakhali Sadar)', 'Begumganj', 'Chatkhil', 'Companiganj', 
      'Hatiya', 'Senbagh', 'Sonaimuri', 'Subarnachar', 'Kabirhat'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Lakshmipur',
    policeStations: [
      'Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati', 'Kamalnagar'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Bandarban',
    policeStations: [
      'Bandarban Sadar', 'Alikadam', 'Lama', 'Naikhongchhari', 'Rowangchhari', 
      'Ruma', 'Thanchi'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Khagrachhari',
    policeStations: [
      'Khagrachhari Sadar', 'Dighinala', 'Lakshmichhari', 'Mahalchhari', 
      'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh', 'Guimara'
    ]
  },
  {
    division: 'Chittagong',
    district: 'Rangamati',
    policeStations: [
      'Kotwali (Rangamati Sadar)', 'Bagaichhari', 'Barkal', 'Belaichhari', 
      'Juraichhari', 'Kaptai', 'Kawkhali', 'Langadu', 'Naniarchar', 'Rajasthali'
    ]
  },

  // --- SYLHET DIVISION ---
  {
    division: 'Sylhet',
    district: 'Sylhet',
    policeStations: [
      'Kotwali Model', 'Jalalabad', 'Airport', 'Shah Paran', 'Moglabazar', 
      'South Surma', 'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 
      'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Zakiganj', 'Osmani Nagar'
    ]
  },
  {
    division: 'Sylhet',
    district: 'Moulvibazar',
    policeStations: [
      'Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 
      'Rajnagar', 'Sreemangal'
    ]
  },
  {
    division: 'Sylhet',
    district: 'Habiganj',
    policeStations: [
      'Habiganj Sadar', 'Ajmiriganj', 'Bahubal', 'Baniyachong', 'Chunarughat', 
      'Lakhai', 'Madhabpur', 'Nabiganj', 'Sayestaganj'
    ]
  },
  {
    division: 'Sylhet',
    district: 'Sunamganj',
    policeStations: [
      'Sunamganj Sadar', 'Bishwamvarpur', 'Chhatak', 'Derai', 'Dharampasha', 
      'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Sullah', 'Tahirpur', 'Dakshin Sunamganj (Shantiganj)', 'Madhyanagar'
    ]
  },

  // --- RAJSHAHI DIVISION ---
  {
    division: 'Rajshahi',
    district: 'Rajshahi',
    policeStations: [
      'Boalia', 'Rajpara', 'Motihar', 'Shah Makhdum', 'Chandrima', 'Kasiadanga', 
      'Katakhali', 'Belpukur', 'Air Port', 'Paba', 'Bagha', 'Bagmara', 
      'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Puthia', 'Tanore'
    ]
  },
  {
    division: 'Rajshahi',
    district: 'Bogura (Bogra)',
    policeStations: [
      'Bogura Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 
      'Kahaloo', 'Nandigram', 'Sariakandi', 'Sahajanpur', 'Sherpur', 'Shibganj', 'Sonatala'
    ]
  },
  {
    division: 'Rajshahi',
    district: 'Pabna',
    policeStations: [
      'Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 
      'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar', 'Ataikula'
    ]
  },
  {
    division: 'Rajshahi',
    district: 'Sirajganj',
    policeStations: [
      'Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 
      'Raiganj', 'Shahjadpur', 'Tarash', 'Ullapara', 'Salanga'
    ]
  },
  {
    division: 'Rajshahi',
    district: 'Naogaon',
    policeStations: [
      'Naogaon Sadar', 'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda', 
      'Mohadevpur', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'
    ]
  },
  {
    division: 'Rajshahi',
    district: 'Natore',
    policeStations: [
      'Natore Sadar', 'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 
      'Singra', 'Naldanga'
    ]
  },
  {
    division: 'Rajshahi',
    district: 'Chapai Nawabganj',
    policeStations: [
      'Nawabganj Sadar', 'Bholahat', 'Gomastapur', 'Nachole', 'Shibganj'
    ]
  },
  {
    division: 'Rajshahi',
    district: 'Joypurhat',
    policeStations: [
      'Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi'
    ]
  },

  // --- KHULNA DIVISION ---
  {
    division: 'Khulna',
    district: 'Khulna',
    policeStations: [
      'Khulna Sadar', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Khan Jahan Ali', 
      'Horintana', 'Aranghata', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 
      'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada'
    ]
  },
  {
    division: 'Khulna',
    district: 'Jashore (Jessore)',
    policeStations: [
      'Kotwali (Jashore Sadar)', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 
      'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha', 'Benapole Port'
    ]
  },
  {
    division: 'Khulna',
    district: 'Kushtia',
    policeStations: [
      'Kushtia Sadar', 'Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Mirpur', 'Islamic University'
    ]
  },
  {
    division: 'Khulna',
    district: 'Bagerhat',
    policeStations: [
      'Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 
      'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'
    ]
  },
  {
    division: 'Khulna',
    district: 'Chuadanga',
    policeStations: [
      'Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar', 'Darshana'
    ]
  },
  {
    division: 'Khulna',
    district: 'Jhenaidah',
    policeStations: [
      'Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'
    ]
  },
  {
    division: 'Khulna',
    district: 'Magura',
    policeStations: [
      'Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'
    ]
  },
  {
    division: 'Khulna',
    district: 'Meherpur',
    policeStations: [
      'Meherpur Sadar', 'Gangni', 'Mujibnagar'
    ]
  },
  {
    division: 'Khulna',
    district: 'Narail',
    policeStations: [
      'Narail Sadar', 'Kalia', 'Lohagara', 'Naragati'
    ]
  },
  {
    division: 'Khulna',
    district: 'Satkhira',
    policeStations: [
      'Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala', 'Patkelghata'
    ]
  },

  // --- BARISAL DIVISION ---
  {
    division: 'Barisal',
    district: 'Barisal (Barishal)',
    policeStations: [
      'Kotwali (Barishal Sadar)', 'Airport', 'Kawnia', 'Bandar', 'Agailjhara', 
      'Babuganj', 'Bakerganj', 'Banaripara', 'Gournadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'
    ]
  },
  {
    division: 'Barisal',
    district: 'Barguna',
    policeStations: [
      'Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Patharghata', 'Taltali'
    ]
  },
  {
    division: 'Barisal',
    district: 'Bhola',
    policeStations: [
      'Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin', 'Dularhat', 'Shashibhusan'
    ]
  },
  {
    division: 'Barisal',
    district: 'Jhalokati',
    policeStations: [
      'Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'
    ]
  },
  {
    division: 'Barisal',
    district: 'Patuakhali',
    policeStations: [
      'Patuakhali Sadar', 'Bauphal', 'Dashmina', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Rangabali', 'Dumki', 'Mohipur'
    ]
  },
  {
    division: 'Barisal',
    district: 'Pirojpur',
    policeStations: [
      'Pirojpur Sadar', 'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad (Swarupkati)', 'Zianagar (Indurkani)'
    ]
  },

  // --- RANGPUR DIVISION ---
  {
    division: 'Rangpur',
    district: 'Rangpur',
    policeStations: [
      'Kotwali (Rangpur Sadar)', 'Haragach', 'Mahiganj', 'Parshuram', 'Hazirhat', 
      'Tajhat', 'Badarganj', 'Gangachhara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'
    ]
  },
  {
    division: 'Rangpur',
    district: 'Dinajpur',
    policeStations: [
      'Kotwali (Dinajpur Sadar)', 'Birampur', 'Birganj', 'Biral', 'Bochaganj', 
      'Chirirbandar', 'Phulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'
    ]
  },
  {
    division: 'Rangpur',
    district: 'Gaibandha',
    policeStations: [
      'Gaibandha Sadar', 'Phulchhari', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'
    ]
  },
  {
    division: 'Rangpur',
    district: 'Kurigram',
    policeStations: [
      'Kurigram Sadar', 'Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Phulbari', 
      'Nageshwari', 'Rajarhat', 'Raomari', 'Ulipur', 'Kachakata'
    ]
  },
  {
    division: 'Rangpur',
    district: 'Lalmonirhat',
    policeStations: [
      'Lalmonirhat Sadar', 'Aditmari', 'Kaliganj', 'Hatibandha', 'Patgram'
    ]
  },
  {
    division: 'Rangpur',
    district: 'Nilphamari',
    policeStations: [
      'Nilphamari Sadar', 'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Saidpur'
    ]
  },
  {
    division: 'Rangpur',
    district: 'Panchagarh',
    policeStations: [
      'Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia'
    ]
  },
  {
    division: 'Rangpur',
    district: 'Thakurgaon',
    policeStations: [
      'Thakurgaon Sadar', 'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail', 'Ruhia'
    ]
  },

  // --- MYMENSINGH DIVISION ---
  {
    division: 'Mymensingh',
    district: 'Mymensingh',
    policeStations: [
      'Kotwali (Mymensingh Sadar)', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 
      'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Trishal', 'Tara Khanda', 'Pagla'
    ]
  },
  {
    division: 'Mymensingh',
    district: 'Jamalpur',
    policeStations: [
      'Jamalpur Sadar', 'Baksiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari', 'Bahadurabad'
    ]
  },
  {
    division: 'Mymensingh',
    district: 'Netrokona',
    policeStations: [
      'Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Khaliajuri', 
      'Kalmakanda', 'Kendua', 'Madan', 'Mohanganj', 'Purbadhala'
    ]
  },
  {
    division: 'Mymensingh',
    district: 'Sherpur',
    policeStations: [
      'Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebardi'
    ]
  }
];

// Helper to get list of unique districts (alphabetically sorted)
export function getBangladeshDistricts(): string[] {
  return BANGLADESH_LOCATIONS.map(loc => loc.district).sort((a, b) => a.localeCompare(b));
}

// Helper to get thanas / police stations for a selected district
export function getPoliceStationsForDistrict(districtName?: string): string[] {
  if (!districtName) return [];
  const clean = districtName.trim().toLowerCase();
  const found = BANGLADESH_LOCATIONS.find(loc => 
    loc.district.toLowerCase() === clean ||
    loc.district.toLowerCase().replace(/[^a-z]/g, '') === clean.replace(/[^a-z]/g, '') ||
    clean.includes(loc.district.toLowerCase()) ||
    loc.district.toLowerCase().includes(clean)
  );
  return found ? [...found.policeStations].sort((a, b) => a.localeCompare(b)) : [];
}

// Helper to get division for a district
export function getDivisionForDistrict(districtName?: string): string {
  if (!districtName) return '';
  const clean = districtName.trim().toLowerCase();
  const found = BANGLADESH_LOCATIONS.find(loc => 
    loc.district.toLowerCase() === clean ||
    loc.district.toLowerCase().replace(/[^a-z]/g, '') === clean.replace(/[^a-z]/g, '')
  );
  return found?.division || '';
}
