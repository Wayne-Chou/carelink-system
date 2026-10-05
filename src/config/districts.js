// 縣市與行政區清單（含郵遞區號），目前只放新北市與台北市

export const CITIES = [
  {
    name: "臺北市",
    districts: [
      { name: "中正區", zip: "100" },
      { name: "大同區", zip: "103" },
      { name: "中山區", zip: "104" },
      { name: "松山區", zip: "105" },
      { name: "大安區", zip: "106" },
      { name: "萬華區", zip: "108" },
      { name: "信義區", zip: "110" },
      { name: "士林區", zip: "111" },
      { name: "北投區", zip: "112" },
      { name: "內湖區", zip: "114" },
      { name: "南港區", zip: "115" },
      { name: "文山區", zip: "116" },
    ],
  },
  {
    name: "新北市",
    districts: [
      { name: "萬里區", zip: "207" },
      { name: "金山區", zip: "208" },
      { name: "板橋區", zip: "220" },
      { name: "汐止區", zip: "221" },
      { name: "深坑區", zip: "222" },
      { name: "石碇區", zip: "223" },
      { name: "瑞芳區", zip: "224" },
      { name: "平溪區", zip: "226" },
      { name: "雙溪區", zip: "227" },
      { name: "貢寮區", zip: "228" },
      { name: "新店區", zip: "231" },
      { name: "坪林區", zip: "232" },
      { name: "烏來區", zip: "233" },
      { name: "永和區", zip: "234" },
      { name: "中和區", zip: "235" },
      { name: "土城區", zip: "236" },
      { name: "三峽區", zip: "237" },
      { name: "樹林區", zip: "238" },
      { name: "鶯歌區", zip: "239" },
      { name: "三重區", zip: "241" },
      { name: "新莊區", zip: "242" },
      { name: "泰山區", zip: "243" },
      { name: "林口區", zip: "244" },
      { name: "蘆洲區", zip: "247" },
      { name: "五股區", zip: "248" },
      { name: "八里區", zip: "249" },
      { name: "淡水區", zip: "251" },
      { name: "三芝區", zip: "252" },
      { name: "石門區", zip: "253" },
    ],
  },
];

// 「台」「臺」視為同一字，方便比對使用者輸入
export function normalizeCityName(name) {
  return String(name ?? "").trim().replace(/^台/, "臺");
}

export function getCityNames() {
  return CITIES.map((c) => c.name);
}

export function getDistricts(city) {
  const target = normalizeCityName(city);
  return CITIES.find((c) => c.name === target)?.districts ?? [];
}

export function getZipCode(city, district) {
  return getDistricts(city).find((d) => d.name === district)?.zip ?? "";
}

// 從地址字串比對縣市與行政區，找不到的部分回傳空字串
export function parseCityDistrict(address) {
  const text = String(address ?? "").replace(/台北市/g, "臺北市");
  for (const city of CITIES) {
    const district = city.districts.find((d) => text.includes(d.name));
    if (text.includes(city.name)) {
      return { city: city.name, district: district?.name ?? "", zip: district?.zip ?? "" };
    }
  }
  // 地址沒寫縣市時，只在行政區名稱能唯一對應一個縣市時才採用（例：信義區只在臺北市）
  const matches = CITIES.flatMap((c) =>
    c.districts.filter((d) => text.includes(d.name)).map((d) => ({ city: c.name, district: d }))
  );
  if (matches.length === 1) {
    const [{ city, district }] = matches;
    return { city, district: district.name, zip: district.zip };
  }
  return { city: "", district: "", zip: "" };
}
