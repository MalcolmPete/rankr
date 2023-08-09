const sleeperUrl = "https://api.sleeper.app/v1/league/968222929374822400";
const backendURL = 'https://backend-q6on.onrender.com';
const localStorageKey = 'playerOrder'; // Define a key for local storage
let extractedData = []; // Declare extractedData outside the function scope
let positionFilter = null;
let overallRankCounter = 0;
let positionRanks = {};

async function getLeagueInfo() {
  // Fetches the URL
  const response = await fetch(sleeperUrl);

  // Parse the response into JSON
  const data = await response.json();

  // Number of teams in the league, needed for ADP API request
  const numOfTeams = data.total_rosters;

  // Current year / season
  const season = data.season;

  // Get ADP info based on league settings
  const scoring = data.scoring_settings.rec;
  let scoringName = "";
  if (scoring === 0) {
    scoringName = "standard";
  } else if (scoring === 0.5) {
    scoringName = "half-ppr";
  } else {
    scoringName = "ppr";
  }

  extractedData = await getADPInfo(scoringName, numOfTeams, season); // Store the extracted data in the outer scope
  displayItemInHTML(extractedData);
}

async function getADPInfo(scoringName, numOfTeams, season) {
  const adpURL = `${backendURL}/api/adp/${scoringName}?teams=${numOfTeams}&year=${season}`;
  const adpResponse = await fetch(adpURL);
  const ADPdata = await adpResponse.json();

  const extractedData = ADPdata.players.map((player, index) => {
    const { name, position, bye, team, adp_formatted } = player;
    return {
      index: index + 1,
      name,
      position,
      bye,
      team,
      adp_formatted,
      totalRank: index + 1,
      positionRank: `${position}${positionRanks[position]}`,
    };
  }); 

  return extractedData; // Return the extracted data
}

function displayItemInHTML(playersData) {
  const listContainer = document.getElementById('sortableListContainer');

  // Remove existing players before updating the list
  listContainer.innerHTML = '';

  // Create a header element for the "rankr" title if it doesn't exist
  if (!document.querySelector('.rankr-title')) {
    const header = document.createElement('h1');
    header.textContent = 'rankr';
    header.className = 'rankr-title';
    listContainer.appendChild(header);
  }

  // Create a header element for the "alpha build" title if it doesn't exist
  if (!document.querySelector('.alpha-header')) {
    const alphaHeader = document.createElement('h2');
    alphaHeader.textContent = 'alpha build';
    alphaHeader.className = 'alpha-header';
    listContainer.appendChild(alphaHeader);
  }

  // Reset counters and position ranks
  overallRankCounter = 0;
  positionRanks = {};

  // Retrieve the saved player order from local storage
  const savedPlayerOrder = JSON.parse(localStorage.getItem(localStorageKey));

  // If the saved order exists, use it to sort the playersData array
  if (Array.isArray(savedPlayerOrder) && savedPlayerOrder.length === playersData.length) {
    playersData.sort((a, b) => {
      const aIndex = savedPlayerOrder.indexOf(a.name);
      const bIndex = savedPlayerOrder.indexOf(b.name);
      return aIndex - bIndex;
    });
  }

  for (let i = 0; i < playersData.length; i++) {
    const player = playersData[i];

    // Check the position filter and skip players if the filter is set and doesn't match
    if (positionFilter && player.position !== positionFilter) {
      continue;
    }

    overallRankCounter++;

    const listItem = document.createElement('li');
    listItem.className = 'item';
    listItem.draggable = true;

    const containerDiv = document.createElement('div');
    containerDiv.className = `player-container ${player.position.toLowerCase()}`; // Add a class for styling and position-based color

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'details';

    // Create and append the overall rank
    const overallRankSpan = document.createElement('span');
    overallRankSpan.textContent = overallRankCounter;
    overallRankSpan.className = 'overall-rank';
    detailsDiv.appendChild(overallRankSpan);

    // Create and append the position rank
    if (!positionRanks[player.position]) {
      positionRanks[player.position] = 1;
    } else {
      positionRanks[player.position]++;
    }
    const positionRankSpan = document.createElement('span');
    positionRankSpan.textContent = `${player.position}${positionRanks[player.position]}`;
    positionRankSpan.className = 'position-rank';
    positionRankSpan.setAttribute('data-position', player.position); // Set the data-position attribute
    positionRankSpan.setAttribute('data-rank', positionRanks[player.position]); // Set the data-rank attribute
    detailsDiv.appendChild(positionRankSpan);

    const image = document.createElement('img');
    image.src = `PlayerPictures/${player.name.replace(/\s/g, '_')}.png`;

    const playerNameSpan = document.createElement('span');
    playerNameSpan.textContent = player.name;
    playerNameSpan.className = 'player-name'; // Add a class for player name span

    const byeSpan = document.createElement('span');
    byeSpan.textContent = `Bye: ${player.bye}`;

    const positionSpan = document.createElement('span');
    positionSpan.textContent = `Position: ${player.position}`;

    const teamSpan = document.createElement('span');
    teamSpan.textContent = `Team: ${player.team}`;

    const adpFormattedSpan = document.createElement('span');
    adpFormattedSpan.textContent = `ADP: ${player.adp_formatted}`;

    detailsDiv.appendChild(image);
    detailsDiv.appendChild(playerNameSpan);
    detailsDiv.appendChild(byeSpan);
    detailsDiv.appendChild(positionSpan);
    detailsDiv.appendChild(teamSpan); // Add team information to details
    detailsDiv.appendChild(adpFormattedSpan); // Add adp_formatted information to details

    const draggableDotsIcon = document.createElement('i');
    draggableDotsIcon.className = 'uil uil-draggabledots';

    containerDiv.appendChild(detailsDiv); // Add the details to the container
    containerDiv.appendChild(draggableDotsIcon);

    listItem.appendChild(containerDiv);
    listContainer.appendChild(listItem);
  }
}

function handleReorder(event) {
  if (!event.target.classList.contains('item')) {
    return; // Skip if the dragged element is not a player item
  }

  const listContainer = document.getElementById('sortableListContainer');

  // Save the current player order to local storage
  const playerElements = listContainer.querySelectorAll('.player-container');
  const playerOrder = Array.from(playerElements).map((playerElement) => {
    const playerName = playerElement.querySelector('.player-name').textContent;
    return playerName;
  });
  localStorage.setItem(localStorageKey, JSON.stringify(playerOrder));

  updateRanks(playerElements);
}

function updateRanks(playerElements) {
  overallRankCounter = 0;
  const updatedPositionRanks = {}; // Create a new object for updated position ranks

  playerElements.forEach((playerElement, index) => {
    const playerName = playerElement.querySelector('.player-name').textContent;
    const playerPosition = playerElement.querySelector('.position-rank').getAttribute('data-position'); // Get player position

    if (!updatedPositionRanks[playerPosition]) {
      updatedPositionRanks[playerPosition] = 1;
    } else {
      updatedPositionRanks[playerPosition]++;
    }

    const positionRank = updatedPositionRanks[playerPosition]; // Get position rank from updatedPositionRanks

    // Update the player object's positionRank
    const playerIndex = extractedData.findIndex(player => player.name === playerName);
    extractedData[playerIndex].positionRank = `${playerPosition}${positionRank}`;

    overallRankCounter++;

    const overallRankSpan = playerElement.querySelector('.overall-rank');
    const positionRankSpan = playerElement.querySelector('.position-rank');

    overallRankSpan.textContent = index + 1;
    positionRankSpan.textContent = `${playerPosition}${positionRank}`;
    positionRankSpan.setAttribute('data-rank', positionRank); // Update the data-rank attribute
  });

  positionRanks = updatedPositionRanks; // Update positionRanks with the new values
}

function updatePositionRanks(playerElements) {
  positionRanks = {}; // Reset positionRanks

  playerElements.forEach((playerElement, index) => {
    const playerPosition = playerElement.querySelector('.position-rank').getAttribute('data-position');

    if (!positionRanks[playerPosition]) {
      positionRanks[playerPosition] = 1;
    } else {
      positionRanks[playerPosition]++;
    }

    const positionRank = positionRanks[playerPosition];

    const playerName = playerElement.querySelector('.player-name').textContent;
    const playerIndex = extractedData.findIndex(player => player.name === playerName);

    // Update the player object's positionRank
    extractedData[playerIndex].positionRank = `${playerPosition}${positionRank}`;

    const positionRankSpan = playerElement.querySelector('.position-rank');
    positionRankSpan.textContent = `${playerPosition}${positionRank}`;
    positionRankSpan.setAttribute('data-rank', positionRank); // Update the data-rank attribute
  });
}

// Event listeners for drag-and-drop functionality
document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('sortableListContainer');
  let draggedItem = null;

  // Event listener for when a player line container is dragged
  listContainer.addEventListener('dragstart', (event) => {
    draggedItem = event.target.closest('.item');
    event.dataTransfer.setData('text', ''); // Set data to enable dragging
  });

  // Event listener for when a player line container is being dragged over another container
  listContainer.addEventListener('dragover', (event) => {
    event.preventDefault();
    const overItem = event.target.closest('.item');
    if (overItem && overItem !== draggedItem) {
      const listRect = listContainer.getBoundingClientRect();
      const overRect = overItem.getBoundingClientRect();
      const draggedRect = draggedItem.getBoundingClientRect();

      if (event.clientY - listRect.top < (overRect.top - listRect.top) + (overRect.height / 2)) {
        listContainer.insertBefore(draggedItem, overItem);
      } else {
        listContainer.insertBefore(draggedItem, overItem.nextElementSibling);
      }
    }
  });

  // Event listener for when a player line container is dropped
  listContainer.addEventListener('drop', async (event) => {
    event.preventDefault();
  
    // Update the order in the local storage after the drop is complete
    handleReorder(event);
  
    // Wait for a brief moment before updating the ranks
    await delay(100);
  
    // Update the position ranks
    updatePositionRanks(listContainer.querySelectorAll('.player-container'));
  
    // Update the displayed players
    displayItemInHTML(extractedData);
  });

  // Event listener for when a player line container is dragged over
  listContainer.addEventListener('dragend', handleReorder);

  // Event listener for position buttons
  const positionButtons = document.querySelectorAll('.position-button');
  positionButtons.forEach(button => {
    button.addEventListener('click', () => {
        positionFilter = button.getAttribute('data-position');

        // For the "All" button, set the position filter to null
        if (positionFilter === "All") {
            positionFilter = null;
        }

        displayItemInHTML(extractedData); // Update the displayed players
    });
  });
});

function exportDataToExcel(data) {
  const XLSX = window.XLSX; // Access XLSX library from the global object

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create separate sheets for each position
  const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'PK', 'DEF'];
  positions.forEach(position => {
    const filteredData = position === 'All' ? data : data.filter(player => player.position === position);
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    XLSX.utils.book_append_sheet(workbook, worksheet, position);
  });

  // Convert the workbook to an XLSX file
  const excelFile = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

  // Convert the array to a Blob
  const blob = new Blob([excelFile], { type: 'application/octet-stream' });

  // Generate the Excel file name with the current date
  const currentDate = new Date().toLocaleDateString().replace(/\//g, '-');
  const fileName = `rankr Fantasy Cheat Sheet ${currentDate}.xlsx`;

  // Create a temporary download link
  const url = URL.createObjectURL(blob);

  // Create an anchor element to trigger the download
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;

  // Append the anchor element to the document and trigger the download
  document.body.appendChild(a);
  a.click();

  // Remove the anchor element and revoke the URL to free resources
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Event listener for the "Export to Excel" button click
const exportButton = document.getElementById('exportButton');
exportButton.addEventListener('click', async () => {
    // Add a delay of 1 second (1000 milliseconds) before exporting
    await delay(1000);
    exportDataToExcel(extractedData);
});

// Helper function to introduce a delay using Promises
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Event listener for the "Upload Excel" button click
const uploadExcelButton = document.getElementById('uploadExcelButton');
uploadExcelButton.addEventListener('click', () => {
  const uploadExcelInput = document.getElementById('uploadExcelInput');
  uploadExcelInput.click(); // Trigger the input click
});

// Event listener for file selection in the input
const uploadExcelInput = document.getElementById('uploadExcelInput');
uploadExcelInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    const data = await readExcelFile(file);
    integrateExcelData(data);
  }
});

// Helper function to read Excel files
async function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
      resolve(excelData);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
}

// Helper function to integrate Excel data
function integrateExcelData(excelData) {
  // Update the player order and ranks based on the Excel data
  const playerOrder = excelData.map(player => player.name);
  localStorage.setItem(localStorageKey, JSON.stringify(playerOrder));
  updatePositionRanks(document.querySelectorAll('.player-container'));
  displayItemInHTML(extractedData);
}
  
getLeagueInfo();
