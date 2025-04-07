const axios = require("axios");
const https = require("https");

async function loadPMap() {
    const { default: pMap } = await import("p-map");
    return pMap;
}

const API_URL = "https://lindstromeq.dis.us/utilservlet-1.0.0/dbstmt";
const USERNAME = "api-service@lindstromeq.dis.us";
const PASSWORD = "cd&7D!09fdW";


const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

async function fetchPriceBooks() {
    try {
        const pMap = await loadPMap(); 
        const response = await axiosInstance.post(
            API_URL,
            new URLSearchParams({ dbStmt: `SELECT IEBOOK as PriceBook FROM disfiles.iem` }),
            {
                auth: { username: USERNAME, password: PASSWORD },
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        if (response.data && response.data.resultset) {
            const priceBooks = response.data.resultset.map(item => item.PRICEBOOK);
            console.log(`Found ${priceBooks.length} pricebooks. Fetching parts data...`);

            await pMap(priceBooks, fetchPartsData, { concurrency: 5 });

            console.log("All pricebooks processed.");
        }
    } catch (error) {
        console.error("Error fetching pricebooks:", error.message);
    }
}

async function fetchPartsData(pricebook) {
    try {
        const letters = [...Array(26)].map((_, i) => "A" + String.fromCharCode(65 + i));
        const results = await Promise.allSettled(
            letters.map(letter => fetchPartDataForLetter(pricebook, letter))
        );

        console.log(`Processed pricebook ${pricebook}.`);
        return results;
    } catch (error) {
        console.error(`Error processing pricebook ${pricebook}:`, error.message);
    }
}

async function fetchPartDataForLetter(pricebook, letter) {
    try {
        const query = `
            SELECT
                TRIM(SUBSTR(K00001,1,18)) AS part_num,
                DEC(SUBSTR(HEX(SUBSTR(F00001,1,4)),1,5) || '.' || SUBSTR(HEX(SUBSTR(F00001,1,4)),6,2),7,2) * 
                    (CASE WHEN SUBSTR(HEX(SUBSTR(F00001,1,4)),8,1) = 'D' THEN -1 ELSE 1 END) AS part_cost,
                TRIM(SUBSTR(F00001,11,16)) AS part_desc
            FROM qs36f.${pricebook}
            WHERE SUBSTR(K00001,19,1) = '1' AND TRIM(SUBSTR(K00001,1,18)) LIKE '${letter}%'`;

        const response = await axiosInstance.post(
            API_URL,
            new URLSearchParams({ dbStmt: query }),
            {
                auth: { username: USERNAME, password: PASSWORD },
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        console.log(`Fetched ${letter} parts for ${pricebook}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching parts (${letter}) for ${pricebook}:`, error.message);
    }
}

fetchPriceBooks();
