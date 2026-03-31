// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');

// API key provided for this project
const NASA_API_KEY = 'NQe74WLZRrT6byHWWdOZYkd3CM3jHi1SM20inozW';
const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const APOD_FIRST_DATE = '1995-06-16';
const TARGET_IMAGE_COUNT = 9;

// Build the modal once and reuse it for every image click
const modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.innerHTML = `
	<div class="modal-box">
		<img class="modal-image" id="modalImage" alt="" />
		<h2 class="modal-title" id="modalTitle"></h2>
		<p class="modal-date" id="modalDate"></p>
		<div class="modal-description-row">
			<p class="modal-description" id="modalDescription"></p>
			<button class="close-button" id="closeModalButton">Close</button>
		</div>
	</div>
`;

document.body.appendChild(modal);

const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDescription = document.getElementById('modalDescription');
const closeModalButton = document.getElementById('closeModalButton');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Show a quick loading message while we fetch data
function showLoadingMessage() {
	gallery.innerHTML = '<p class="status-message">Loading space images...</p>';
}

// Show errors in a beginner-friendly way
function showErrorMessage(message) {
	gallery.innerHTML = `<p class="status-message">${message}</p>`;
}

function openModal(item) {
	modalImage.src = item.hdurl || item.url;
	modalImage.alt = item.title;
	modalTitle.textContent = item.title;
	modalDate.textContent = item.date;
	modalDescription.textContent = item.explanation;

	modal.classList.add('show');
}

function closeModal() {
	modal.classList.remove('show');
}

function formatDate(date) {
	return date.toISOString().split('T')[0];
}

function addDays(dateString, days) {
	const date = new Date(`${dateString}T00:00:00`);
	date.setDate(date.getDate() + days);
	return formatDate(date);
}

function getInclusiveDayCount(startDate, endDate) {
	const oneDayMs = 24 * 60 * 60 * 1000;
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);
	return Math.floor((end - start) / oneDayMs) + 1;
}

async function fetchApodRange(startDate, endDate) {
	const url = `${APOD_URL}?api_key=${NASA_API_KEY}&start_date=${startDate}&end_date=${endDate}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('NASA request failed.');
	}

	const data = await response.json();
	return Array.isArray(data) ? data : [data];
}

// Create one card for each image
function createImageCard(item) {
	const card = document.createElement('article');
	card.className = 'card';

	card.innerHTML = `
		<img src="${item.url}" alt="${item.title}" />
		<div class="card-content">
			<h2>${item.title}</h2>
			<p class="date">${item.date}</p>
		</div>
	`;

	card.addEventListener('click', () => {
		openModal(item);
	});

	return card;
}

// Render all image results in the gallery
function renderGallery(items) {
	gallery.innerHTML = '';

	if (items.length === 0) {
		showErrorMessage('No image results were found for that date range.');
		return;
	}

	items.forEach((item) => {
		gallery.appendChild(createImageCard(item));
	});
}

// Fetch APOD data from NASA and display it
async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		showErrorMessage('Please choose both a start date and end date.');
		return;
	}

	if (startDate > endDate) {
		showErrorMessage('Start date must be before or equal to end date.');
		return;
	}

	showLoadingMessage();

	try {
		const requestedDayCount = getInclusiveDayCount(startDate, endDate);
		const targetCount = Math.min(TARGET_IMAGE_COUNT, requestedDayCount);

		// 1) Get the selected date range first
		let items = await fetchApodRange(startDate, endDate);
		let imageItems = items.filter((item) => item.media_type === 'image');

		// 2) If needed, fetch earlier dates to fill missing image slots
		let backfillEnd = addDays(startDate, -1);
		while (imageItems.length < targetCount && backfillEnd >= APOD_FIRST_DATE) {
			let backfillStart = addDays(backfillEnd, -14);
			if (backfillStart < APOD_FIRST_DATE) {
				backfillStart = APOD_FIRST_DATE;
			}

			const extraItems = await fetchApodRange(backfillStart, backfillEnd);
			items = items.concat(extraItems);
			imageItems = items.filter((item) => item.media_type === 'image');

			if (backfillStart === APOD_FIRST_DATE) {
				break;
			}

			backfillEnd = addDays(backfillStart, -1);
		}

		// Most recent first, then display the needed count
		imageItems.sort((a, b) => (a.date < b.date ? 1 : -1));
		renderGallery(imageItems.slice(0, targetCount));
	} catch (error) {
		showErrorMessage('Could not load NASA images right now. Please try again.');
	}
}

getImagesButton.addEventListener('click', getSpaceImages);
closeModalButton.addEventListener('click', closeModal);

// Close modal when clicking outside the modal box
modal.addEventListener('click', (event) => {
	if (event.target === modal) {
		closeModal();
	}
});
