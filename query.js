import axios from 'axios';  // Use import instead of require
import https from 'https';   // Use import instead of require
import fetch from 'node-fetch';  // Use import instead of require
async function loadPMap() {
    const { default: pMap } = await import("p-map");
    return pMap;
}
const API_URL = "https://lindstromeq.dis.us/utilservlet-1.0.0/dbstmt";
const USERNAME = "api-service@lindstromeq.dis.us";
const PASSWORD = "cd&7D!09fdW";
const token = "liopi5lx7o7tzyb018wznd05g4fmhq0";
const storehash = "ywv2zd8w30";
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});
async function fetchPriceBooks() {
    try { 
        const pMap = await loadPMap(); 
        const response = await axiosInstance.post(
            API_URL,
            new URLSearchParams({ dbStmt: `select IEBOOK as PriceBook, IEDESC as PriceBookDesc, IETITL as PriceBookSubtitle, (CASE WHEN DEC(IEDATE,6,0) = 0 THEN '0' ELSE (CASE WHEN DEC(SUBSTR((1000000+IEDATE),2,2),2,0) > 40 THEN '19' ELSE '20' END) || SUBSTR((1000000+IEDATE),2,2) || SUBSTR((1000000+IEDATE),4,4) END) AS PriceBookDate from disfiles.iem` }),
            {
                auth: { username: USERNAME, password: PASSWORD },
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        ); 
        if (response.data && response.data.resultset) {
            const priceBooks = response.data.resultset.map(item => item.PRICEBOOK);
           // console.log(`Found ${priceBooks.length} pricebooks. Fetching parts data...`);

            await pMap(priceBooks, fetchPartsData, { concurrency: 5 });

            //console.log("All pricebooks processed.");
        }
    } catch (error) {
        console.error("Error fetching pricebooks:", error.message);
    }
}
async function fetchPartsData(pricebook) {
    try { 
		const generateCombinations = () => {
  // For AA to AZ, BA to BZ
  const letterCombinations = []; 
  for (let i = 0; i < 26; i++) {
    const firstLetter = String.fromCharCode(65 + i); // A, B, C, ..., Z
    letterCombinations.push(firstLetter); 
    for (let j = 0; j < 26; j++) {
      letterCombinations.push(firstLetter + String.fromCharCode(65 + j)); // AA, AB, ..., AZ, BA, ..., BZ
    }
  }
  // For 1A to 1Z and -1A to -1Z
  const numberLetterCombinations = [];
  for (let i = 0; i < 26; i++) {
    numberLetterCombinations.push("1" + String.fromCharCode(65 + i)); // 1A, 1B, ..., 1Z
    numberLetterCombinations.push("-1" + String.fromCharCode(65 + i)); // -1A, -1B, ..., -1Z
  }
  // For A1 to A9
  const letterNumberCombinations = [];
  for (let i = 1; i <= 9; i++) {
    letterNumberCombinations.push("A" + i); // A1, A2, ..., A9
  }
  // For 11 to 19
  const numberRangeCombinations = [];
  for (let i = 11; i <= 19; i++) {
    numberRangeCombinations.push(i.toString()); // 11, 12, ..., 19
  }
  // For -11 to -19
  const negativeNumberRangeCombinations = [];
  for (let i = -11; i <= -19; i++) {
    negativeNumberRangeCombinations.push(i.toString()); // -11, -12, ..., -19
  }
  // Combine all results into a single array
  return [
    ...letterCombinations 
    ...numberLetterCombinations, 
    ...letterNumberCombinations, 
    ...numberRangeCombinations, 
    ...negativeNumberRangeCombinations
  ];
};
const combinations = generateCombinations();
const results = await Promise.allSettled(
            combinations.map(letter => fetchPartDataForLetter(pricebook, letter))
        );
		return results;
        const letters = [...Array(26)].map((_, i) => "A" + String.fromCharCode(65 + i));
        const results1 = await Promise.allSettled(
            letters.map(letter => fetchPartDataForLetter(pricebook, letter))
        );
        //return results1;
    } catch (error) {
       // console.error(`Error processing pricebook ${pricebook}:`, error.message);
    }
}
async function fetchPartDataForLetter(pricebook, letter) {
    try { 
        const query = `
            select
					TRIM(SUBSTR(K00001,1,18)) part_num,
					dec(substr(hex(substr(F00001,1,4)),1,5) || '.' || substr(hex(substr(F00001,1,4)),6,2),7,2) * (case when substr(hex(substr(F00001,1,4)),8,1) = 'D' then 
					-1 else 1 end) part_cost,
					dec(substr(hex(substr(F00001,5,4)),1,5) || '.' || substr(hex(substr(F00001,5,4)),6,2),7,2) * (case when substr(hex(substr(F00001,5,4)),8,1) = 'D' then 
					-1 else 1 end) part_list,
					dec(substr(hex(substr(F00001,9,2)),1,3)) * (case when substr(hex(substr(F00001,9,2)),4,1) = 'D' then -1 else 1 end) part_packqty,
					TRIM(SUBSTR(F00001,11,16)) part_desc,
					dec(substr(hex(substr(F00001,27,2)),1,3)) * (case when substr(hex(substr(F00001,27,2)),4,1) = 'D' then -1 else 1 end) part_multiplier,
					SUBSTR(F00001,29,1) part_category,
					dec(substr(hex(substr(F00001,30,3)),1,4) || '.' || substr(hex(substr(F00001,30,3)),5,1),7,1) * (case when substr(hex(substr(F00001,30,3)),6,1) = 'D' 
					then -1 else 1 end) part_weight
					from
					qs36f.${pricebook}
					WHERE
					SUBSTR(K00001,19,1) = '1' and TRIM(SUBSTR(K00001,1,18)) like 'AMAT20094%'`;

        const response = await axiosInstance.post(
            API_URL,
            new URLSearchParams({ dbStmt: query }),
            {
                auth: { username: USERNAME, password: PASSWORD },
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        ); 
        if (response.data && response.data.resultset) {
            const priceBooks = response.data.resultset.map(item => ({
                name: item.PART_NUM,                     
                calculated_price: item.PART_COST,        
                part_list: item.PART_LIST
            }));  
            if (priceBooks.length > 0) {
                //console.log(`Processing ${priceBooks.length} items with concurrency of 5...`);
                //await pMap(priceBooks, getbigcommerceitems, { concurrency: 5 });
                const price_book_results = await Promise.allSettled(
                    priceBooks.map(priceBook => getbigcommerceitems(priceBooks))
                );
               // console.log(`Finished processing ${priceBooks.length} items.`);
            } else {
               // console.log("No items to process.");
            }            
        }
        //console.log(`Fetched ${letter} parts for ${pricebook}`);
       // return response.data;
    } catch (error) {
        //console.error(`Error fetching parts (${letter}) for ${pricebook}:`, error.message);
    }
}

async function getbigcommerceitems(item) { 
    try{ 
        const pMap = await loadPMap(); 
        //console.log('item');
        console.log(item);
        const sku = item[0].name;
        //const calculated_price = item[0].calculated_price;
        const part_list = item[0].part_list;
        let url = `https://api.bigcommerce.com/stores/${storehash}/v3/catalog/products?sku=${sku}`;
        //console.log(url);
        let options = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Auth-Token': token  // Template literal fixed here
            }
        };
        const res = await fetch(url, options);  // Await fetch to get the response
        const json = await res.json();         // Parse the JSON response
        
        if (json.data) { console.log(json.data);  
            // Mapping to extract the name of each item
            const item_ids = json.data.map(data => (data.id));
            if (item_ids.length > 0) {
                const price_book_results = await Promise.allSettled(
                    item_ids.map(priceBook => updatebigcommerceitemprice(item_ids,part_list))
                );
                const bulk_price_book_results = await Promise.allSettled(
                    item_ids.map(priceBook => getbigcommercebulkid(item_ids,part_list))
                );
            }
        }
    } catch (error) {
        console.error("Error fetching pricebooks:", error.message);
    }
}
async function updatebigcommerceitemprice(item_id,price){
	try{ 
		const pMap = await loadPMap(); 
        let url = `https://api.bigcommerce.com/stores/${storehash}/v3/catalog/products/${item_id}`;
        let options = {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Auth-Token': token  // Correctly using template literal for token
            },
            body: JSON.stringify({ price: price })  // Corrected the price data format using JSON.stringify
        };
        
console.log(options);
        const res = await fetch(url, options);  // Await fetch to get the response
        const json = await res.json();         // Parse the JSON response
        console.log(json);
    } catch (error) {
        console.error("Error fetching pricebooks:", error.message);
    }
}
async function getbigcommercebulkid(item_id,bulk_price){
	try{ 
		const pMap = await loadPMap(); 
        let url = `https://api.bigcommerce.com/stores/${storehash}/v2/products/${item_id}/discount_rules`;
        console.log(url);
        let options = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Auth-Token': token  // Template literal fixed here
            }
        };
        const res = await fetch(url, options);  // Await fetch to get the response
        const bulkDataResponse = await res.json();         // Parse the JSON response
        console.log(bulkDataResponse);
        let productPriceData = [];
        if (bulkDataResponse) { 
            productPriceData = bulkDataResponse;  // Populate productPriceData with the response data
            for (const bulkData of productPriceData) {
                if (bulkData.min >= 10) {
                    const priceListId = bulkData.id;
                    const url = `https://api.bigcommerce.com/stores/${storehash}/v3/catalog/products/${item_id}/bulk-pricing-rules/${priceListId}`;
                    const bulkPrice = bulk_price * 0.95;
                    console.log(bulk_price);
                    // Sending PUT request with axios
                    const response = await axios.put(url, {
                        type: 'price',
                        amount: bulkPrice
                    }, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-Auth-Token': token
                        }
                    });
    
                    console.log(response.data); // Log the response from the API
                }
            }
        }
    } catch (error) {
        console.error("Error fetching pricebooks:", error.message);
    }
}
fetchPriceBooks();
