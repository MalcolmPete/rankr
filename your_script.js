const sleeperUrl = "https://api.sleeper.app/v1/league/968222929374822400";
const backendURL = 'http://localhost:3000';
const localStorageKey = 'playerOrder'; // Define a key for local storage
let extractedData = []; // Declare extractedData outside the function scope

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

  const extractedData = [];
  for (let i = 0; i < 10; i++) { // Fetch data for 10 players
    const { name, position, bye } = ADPdata.players[i];
    const itemWithIndex = { index: i + 1, name, position, bye };
    extractedData.push(itemWithIndex);
  }

  return extractedData; // Return the extracted data
}

function displayItemInHTML(playersData) {
    const listContainer = document.getElementById('sortableListContainer');
  
    // Create a header element for the "rankr" title
    const header = document.createElement('h1');
    header.textContent = 'rankr';
    header.className = 'rankr-title'; // Add a class for styling the title
    listContainer.insertBefore(header, listContainer.firstChild);
  
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
  
      const listItem = document.createElement('li');
      listItem.className = 'item';
      listItem.draggable = true;
  
      const containerDiv = document.createElement('div'); // Container for grouping elements
      containerDiv.className = 'player-container'; // Add a CSS class for styling if needed
  
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'details';
  
      const image = document.createElement('img');
      image.src = `PlayerPictures/${player.name.replace(/\s/g, '_')}.png`;
  
      const playerNameSpan = document.createElement('span');
      playerNameSpan.textContent = player.name;
      playerNameSpan.className = 'player-name'; // Add a class for player name span
  
      const byeSpan = document.createElement('span');
      byeSpan.textContent = `Bye: ${player.bye}`;
  
      const positionSpan = document.createElement('span');
      positionSpan.textContent = `Position: ${player.position}`;
  
      detailsDiv.appendChild(image);
      detailsDiv.appendChild(playerNameSpan);
      detailsDiv.appendChild(byeSpan);
      detailsDiv.appendChild(positionSpan);
  
      const draggableDotsIcon = document.createElement('i');
      draggableDotsIcon.className = 'uil uil-draggabledots';
  
      containerDiv.appendChild(detailsDiv); // Add the details to the container
      containerDiv.appendChild(draggableDotsIcon);
  
      listItem.appendChild(containerDiv); // Add the container to the list item
      listContainer.appendChild(listItem);
    }
}

function handleReorder(event) {
  if (!event.target.classList.contains('item')) {
    return; // Skip if the dragged element is not a player item
  }

  const listContainer = document.getElementById('sortableListContainer');

  // Save the current player order to local storage
  const playerOrder = extractedData.map((player) => {
    return player.name;
  });
  localStorage.setItem(localStorageKey, JSON.stringify(playerOrder));
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
  listContainer.addEventListener('drop', (event) => {
    event.preventDefault();
  });

  // Event listener for when a player line container is dragged over
  listContainer.addEventListener('dragend', handleReorder); // Use the handleReorder function here
});

function exportDataToExcel(data) {
    const XLSX = window.XLSX; // Access the XLSX object from the global window object
    const { saveAs } = window.require('file-saver'); // Use window.require to access the require function

    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: ['name', 'position', 'bye'], // Set the headers for the columns
    });

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Player Data');

    // Convert the workbook to an Excel file
    const excelFile = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    // Save the Excel file
    const blob = new Blob([excelFile], { type: 'application/octet-stream' });
    saveAs(blob, 'player_data.xlsx');
}

// Event listener for the "Export to Excel" button click
const exportButton = document.getElementById('exportButton');
exportButton.addEventListener('click', () => {
    exportDataToExcel(extractedData);
});
  
getLeagueInfo();
