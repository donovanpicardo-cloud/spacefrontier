export const solarArchive = {
  date: "2024-05-14",
  peak: "12:51 p.m. ET",
  classification: "X8.7",
  url: "https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/strong-solar-flare-erupts-from-sun-15/",
};
export const donkiArchive = {
  date: "10 September 2017",
  detection: "16:45 UTC",
  instrument: "GOES-13",
  eventId: "2017-09-10T16:45:00-SEP-001",
  url: "https://ccmc.gsfc.nasa.gov/assessment/topics/SEP/campaign2020/20170910.php",
};
export const greenhouseSource =
  "https://www.asc-csa.gc.ca/eng/youth-educators/activities/fitness-and-nutrition/interplanetary-farming.asp";
export const sources = [
  {
    title: "DONKI solar energetic particle event",
    url: donkiArchive.url,
    note: "NASA CCMC archive for the 10 September 2017 event recorded near Earth by GOES-13.",
  },
  {
    title: "Canadian Space Agency · Interplanetary Farming",
    url: greenhouseSource,
    note: "Light and water requirements for growing food in space.",
  },
  {
    title: "Apollo Lunar Module model",
    url: "https://science.nasa.gov/3d-resources/apollo-lunar-module/",
    note: "NASA / Michael D. Carbajal. Optimized historical Moon landmark; educational use, no endorsement.",
  },
  {
    title: "Moon and Mars signal travel time",
    url: "https://science.nasa.gov/wp-content/uploads/2023/05/188_fed0ad8278e728107533d509b24dc68b_SmithsimmonsDrew.pdf",
    note: "Moon signals take about 1.3 seconds each way. Mars delays are much longer; all radio advice here is simulated locally.",
  },
  {
    title: "Archived solar event: 14 May 2024",
    url: solarArchive.url,
    note: "NASA SDO observed an X8.7 flare, peaking at 12:51 p.m. ET. Static historical record, not live space weather or an outpost dose measurement.",
  },
  {
    title: "Mars communication delay",
    url: "https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf",
    note: "Distance delays Earth replies. Game radio waits are shortened, not real mission timings.",
  },
  {
    title: "Moon facts",
    url: "https://science.nasa.gov/moon/facts/",
    note: "Airless lunar environment; gravity modeled as 1.62 m/s².",
  },
  {
    title: "Mars facts",
    url: "https://science.nasa.gov/mars/facts/",
    note: "Thin, unbreathable atmosphere; gravity modeled as 3.71 m/s².",
  },
  {
    title: "Environmental Control and Life Support Systems",
    url: "https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/",
    note: "Water recovery, atmospheric control and oxygen generation principles.",
  },
];
export const gravity = { moon: 1.62, mars: 3.71 };

