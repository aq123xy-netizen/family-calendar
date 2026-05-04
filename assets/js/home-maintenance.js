(function () {
  var storageKey = "family-calendar-maintenance";
  var form = document.getElementById("maintenance-reminder-form");
  var formError = document.getElementById("maintenance-form-error");
  var titleInput = document.getElementById("maintenance-title");
  var dueDateInput = document.getElementById("maintenance-due-date");
  var categoryInput = document.getElementById("maintenance-category");
  var repeatInput = document.getElementById("maintenance-repeat");
  var reminderInput = document.getElementById("maintenance-reminder");
  var upcomingElement = document.getElementById("maintenance-upcoming-list");
  var libraryElement = document.getElementById("maintenance-library-list");
  var maintenanceItems = [];

  if (!upcomingElement || !libraryElement || !form) {
    return;
  }

  function formatDate(dateString) {
    return new Date(dateString + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function hideFormError() {
    formError.textContent = "";
    formError.classList.add("d-none");
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.classList.remove("d-none");
  }

  function loadStoredCollection() {
    try {
      var rawValue = localStorage.getItem(storageKey);

      if (!rawValue) {
        return null;
      }

      var parsedValue = JSON.parse(rawValue);

      return Array.isArray(parsedValue) ? parsedValue : null;
    } catch (error) {
      return null;
    }
  }

  function saveItems() {
    localStorage.setItem(storageKey, JSON.stringify(maintenanceItems));
  }

  function makeId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
  }

  function sortItems(items) {
    return items.slice().sort(function (left, right) {
      return left.dueDate.localeCompare(right.dueDate);
    });
  }

  function renderList(targetElement, items, emptyMessage) {
    if (!items.length) {
      targetElement.innerHTML = '<div class="dashboard-empty-state">' + emptyMessage + "</div>";
      return;
    }

    targetElement.innerHTML = items.map(function (item) {
      return [
        '<div class="maintenance-item">',
        '<div class="maintenance-item-header">',
        '<h3 class="maintenance-item-title">', item.title, "</h3>",
        '<span class="maintenance-item-date">', formatDate(item.dueDate), "</span>",
        "</div>",
        '<div class="maintenance-item-meta">',
        '<span class="dashboard-item-category">', item.category || "House maintenance", "</span>",
        '<span class="dashboard-item-meta">', item.repeat || "One-time", "</span>",
        '<span class="dashboard-item-meta">', item.reminder || "No reminder", "</span>",
        "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderPage() {
    var todayString = new Date().toISOString().slice(0, 10);
    var sortedItems = sortItems(maintenanceItems);
    var upcomingItems = sortedItems.filter(function (item) {
      return item.dueDate >= todayString;
    }).slice(0, 4);

    renderList(upcomingElement, upcomingItems, "No upcoming reminders.");
    renderList(libraryElement, sortedItems, "No maintenance items yet.");
  }

  fetch("assets/home-maintenance.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load home-maintenance.json");
      }

      return response.json();
    })
    .then(function (items) {
      maintenanceItems = loadStoredCollection() || items;
      renderPage();
    })
    .catch(function () {
      renderList(upcomingElement, [], "The reminder data could not be loaded.");
      renderList(libraryElement, [], "The reminder data could not be loaded.");
    });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideFormError();

    var title = titleInput.value.trim();
    var dueDate = dueDateInput.value;
    var category = categoryInput.value;

    if (!title) {
      showFormError("Please enter a reminder title.");
      return;
    }

    if (!dueDate) {
      showFormError("Please choose a due date.");
      return;
    }

    if (!category) {
      showFormError("Please choose a category.");
      return;
    }

    maintenanceItems.push({
      id: makeId("maintenance"),
      title: title,
      category: category,
      dueDate: dueDate,
      repeat: repeatInput.value.trim() || "One-time",
      reminder: reminderInput.value.trim() || "No reminder",
      source: "home-maintenance",
      color: "#0f766e"
    });

    saveItems();
    renderPage();
    form.reset();
    categoryInput.value = "House maintenance";
  });
})();
