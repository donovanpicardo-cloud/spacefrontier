// Verified 2026-11-14. Bundled references; gameplay makes no API requests.
export const research = {
 trek:'https://trek.nasa.gov/mars/', layers:'https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars',
 jezero:'https://science.nasa.gov/photojournal/possible-path-for-perseverance-rover/',
 study:'https://osdr.nasa.gov/bio/repo/data/studies/OSD-267', bioApi:'https://visualization.osdr.nasa.gov/biodata/api/',
 farming:'https://www.asc-csa.gc.ca/eng/youth-educators/activities/fitness-and-nutrition/interplanetary-farming.asp',
 food:'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/',
 donki:'https://ccmc.gsfc.nasa.gov/tools/DONKI/', event:'https://ccmc.gsfc.nasa.gov/assessment/topics/SEP/campaign2020/20170910.php',
 radlab:'https://visualization.osdr.nasa.gov/radlab/gui/overview/', radApi:'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
};
export const romaineStudy = {accession:'OSD-267',version:8,crop:'Outredgeous red romaine',start:'2014-05-08',harvest:'2014-06-10'};
// API response filtered to DosTel1; original precision. Separate 2022 ISS example.
export const radlabSample = {
 spacecraft:'ISS',instrument:'DosTel1',date:'2022-04-01',units:'μGy/hour',
 query:'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-01T23%3A05&absorbed_dose_rate&format=json',
 readings:[['23:00:00',9.815504],['23:00:33',9.835079],['23:02:13',7.949537],['23:03:53',6.228811]] as const,
};

