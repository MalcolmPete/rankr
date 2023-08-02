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

  const extractedData = ADPdata.players.map((player, index) => {
    const { name, position, bye, team, adp_formatted } = player;
    return { index: index + 1, name, position, bye, team, adp_formatted };
  });

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
  const playerElements = listContainer.querySelectorAll('.player-container');
  const playerOrder = Array.from(playerElements).map((playerElement) => {
    const playerName = playerElement.querySelector('.player-name').textContent;
    return playerName;
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

    // Update the order in the local storage after the drop is complete
    handleReorder(event);
  });

  // Event listener for when a player line container is dragged over
  listContainer.addEventListener('dragend', handleReorder);
});

function exportDataToExcel(data) {
  const XLSX = window.XLSX; // Access XLSX library from the global object

  // Create the worksheet from the data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Create a new workbook and add the worksheet to it
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Player Data');

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
exportButton.addEventListener('click', () => {
    exportDataToExcel(extractedData);
});
  
getLeagueInfo();
