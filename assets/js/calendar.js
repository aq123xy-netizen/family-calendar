(function () {
  var dataApi = window.familyCalendarData;
  var calendarElement = document.getElementById("calendar");
  var filtersElement = document.getElementById("calendar-filters");
  var userFilterDropdown = document.getElementById("user-filter-dropdown");
  var userFilterToggleButton = document.getElementById("user-filter-toggle");
  var userFilterMenu = document.getElementById("user-filter-menu");
  var userFilterSelectAllButton = document.getElementById("user-filter-select-all");
  var userFilterClearButton = document.getElementById("user-filter-clear");
  var maintenanceFilterToggleButton = document.getElementById("maintenance-filter-toggle");
  var todayPanelDate = document.getElementById("today-panel-date");
  var todayEventsElement = document.getElementById("today-events");
  var upcomingRemindersElement = document.getElementById("upcoming-reminders");
  var openEventFormButton = document.getElementById("open-event-form");
  var openUserFormButton = document.getElementById("open-user-form");

  var eventModalElement = document.getElementById("event-modal");
  var eventForm = document.getElementById("calendar-event-form");
  var eventFormHeading = document.getElementById("event-form-heading");
  var eventFormCopy = document.getElementById("event-form-copy");
  var eventFormError = document.getElementById("event-form-error");
  var eventTitleInput = document.getElementById("event-title");
  var eventDateTimeInput = document.getElementById("event-datetime");
  var eventPersonInput = document.getElementById("event-person");
  var eventCategoryInput = document.getElementById("event-category");
  var eventColorSwatch = document.getElementById("event-color-swatch");
  var eventColorLabel = document.getElementById("event-color-label");
  var deleteEventButton = document.getElementById("delete-event-button");
  var saveEventButton = document.getElementById("save-event-button");

  var userModalElement = document.getElementById("user-modal");
  var userForm = document.getElementById("user-profile-form");
  var userFormError = document.getElementById("user-form-error");
  var profileNameInput = document.getElementById("profile-name");
  var profileColorInput = document.getElementById("profile-color");
  var profileColorPalette = document.getElementById("profile-color-palette");
  var profileIconPicker = document.getElementById("profile-icon-picker");
  var profileIconInput = document.getElementById("profile-icon");
  var saveProfileButton = document.getElementById("save-profile-button");
  var userProfileList = document.getElementById("user-profile-list");

  var detailsModalElement = document.getElementById("item-details-modal");
  var detailsHeading = document.getElementById("item-details-heading");
  var detailsCopy = document.getElementById("item-details-copy");
  var detailsBody = document.getElementById("item-details-body");
  var detailsAddButton = document.getElementById("details-add-button");

  var eventModal = eventModalElement && window.bootstrap ? new window.bootstrap.Modal(eventModalElement) : null;
  var userModal = userModalElement && window.bootstrap ? new window.bootstrap.Modal(userModalElement) : null;
  var detailsModal = detailsModalElement && window.bootstrap ? new window.bootstrap.Modal(detailsModalElement) : null;

  var colorOptions = ["#4285f4", "#34a853", "#fbbc05", "#ea4335", "#7c3aed", "#0f766e", "#ec4899", "#f97316"];
  var iconOptions = [
    "bi-person-fill",
    "bi-person-standing",
    "bi-person-hearts",
    "bi-person-heart",
    "bi-people-fill",
    "bi-heart-fill",
    "bi-star-fill",
    "bi-balloon-heart-fill",
    "bi-emoji-smile-fill",
    "bi-house-heart-fill",
    "bi-bookmark-heart-fill",
    "bi-cat"
  ];
  var reminderColor = "#0f766e";
  var state = {
    household: null,
    profiles: [],
    events: [],
    reminders: [],
    activeProfileIds: {},
    selectedDate: new Date().toISOString().slice(0, 10),
    editingEventId: null,
    editingProfileId: null,
    detailsDate: null,
    showMaintenanceItems: true
  };
  var calendar = null;

  if (!calendarElement || !window.FullCalendar || !dataApi) {
    return;
  }

  function formatHeading(dateString) {
    return new Date(dateString + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatDate(dateString) {
    return new Date(dateString + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatTime(timeString) {
    if (!timeString) {
      return "All day";
    }

    return new Date("1970-01-01T" + timeString).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function buildDateTimeValue(dateString, timeString) {
    return dateString + "T" + (timeString || "00:00");
  }

  function splitDateTimeValue(dateTimeValue) {
    var parts = dateTimeValue.split("T");

    return {
      date: parts[0],
      time: parts[1] || ""
    };
  }

  function sortByDateTime(items) {
    return items.slice().sort(function (left, right) {
      var leftValue = (left.date || left.dueDate) + "T" + (left.time || "23:59");
      var rightValue = (right.date || right.dueDate) + "T" + (right.time || "23:59");

      return leftValue.localeCompare(rightValue);
    });
  }

  function hideFormError(element) {
    if (!element) {
      return;
    }

    element.textContent = "";
    element.classList.add("d-none");
  }

  function showFormError(element, message) {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.classList.remove("d-none");
  }

  function setModalVisibility(modalInstance, isVisible) {
    if (!modalInstance) {
      return;
    }

    if (isVisible) {
      modalInstance.show();
      return;
    }

    modalInstance.hide();
  }

  function getProfileById(profileId) {
    return state.profiles.find(function (profile) {
      return profile.id === profileId;
    }) || null;
  }

  function findEventById(id) {
    return state.events.find(function (event) {
      return event.id === id;
    }) || null;
  }

  function findReminderById(id) {
    return state.reminders.find(function (reminder) {
      return reminder.id === id;
    }) || null;
  }

  function normalizeEvents(eventRows) {
    state.events = eventRows.map(function (eventRow) {
      var matchedProfile = getProfileById(eventRow.profile_id);

      return {
        id: eventRow.id,
        title: eventRow.title,
        date: eventRow.date,
        time: eventRow.time || "",
        category: eventRow.category || "Family",
        profileId: eventRow.profile_id,
        person: matchedProfile ? matchedProfile.name : "Unknown",
        color: matchedProfile ? matchedProfile.color : "#4285f4",
        icon: matchedProfile ? matchedProfile.icon : "bi-person-fill"
      };
    });
  }

  function getReminderItems() {
    return state.reminders.map(function (reminder) {
      return {
        id: reminder.id,
        title: reminder.title,
        date: reminder.dueDate,
        dueDate: reminder.dueDate,
        time: "",
        category: reminder.category || "House maintenance",
        repeat: reminder.repeat || "",
        reminder: reminder.reminder || "",
        color: reminder.color || reminderColor,
        type: "reminder",
        label: "Reminder due"
      };
    });
  }

  function isProfileVisible(profileId) {
    if (!profileId) {
      return true;
    }

    return state.activeProfileIds[profileId] !== false;
  }

  function getVisibleEvents() {
    return state.events.filter(function (event) {
      return isProfileVisible(event.profileId);
    });
  }

  function getCombinedItemsForDate(dateString) {
    var calendarItems = getVisibleEvents().filter(function (event) {
      return event.date === dateString;
    }).map(function (event) {
      return {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time || "",
        category: event.category || "Family",
        person: event.person,
        color: event.color,
        icon: event.icon || "bi-person-fill",
        type: "event",
        label: event.time ? "Scheduled" : "All day"
      };
    });
    var reminders = state.showMaintenanceItems ? getReminderItems().filter(function (item) {
      return item.date === dateString;
    }) : [];

    return sortByDateTime(calendarItems.concat(reminders));
  }

  function buildCalendarEntries() {
    var eventEntries = getVisibleEvents().map(function (event) {
      return {
        id: event.id,
        title: event.title,
        start: event.time ? event.date + "T" + event.time : event.date,
        allDay: !event.time,
        backgroundColor: event.color,
        borderColor: event.color,
        extendedProps: {
          itemType: "event",
          person: event.person,
          category: event.category || "Family",
          color: event.color,
          icon: event.icon || "bi-person-fill",
          time: event.time || ""
        }
      };
    });
    var reminderEntries = state.showMaintenanceItems ? getReminderItems().map(function (item) {
      return {
        id: item.id,
        title: item.title,
        start: item.date,
        allDay: true,
        backgroundColor: item.color,
        borderColor: item.color,
        extendedProps: {
          itemType: "reminder",
          category: item.category,
          color: item.color,
          icon: "bi-tools",
          repeat: item.repeat,
          reminder: item.reminder,
          label: item.label,
          time: ""
        }
      };
    }) : [];

    return eventEntries.concat(reminderEntries);
  }

  function renderProfileSelect() {
    eventPersonInput.innerHTML = state.profiles.map(function (profile) {
      return '<option value="' + profile.id + '">' + profile.name + "</option>";
    }).join("");

    updateEventColorPreview();
  }

  function updateEventColorPreview() {
    var selectedProfile = getProfileById(eventPersonInput.value);

    if (!selectedProfile) {
      eventColorSwatch.style.backgroundColor = "#cbd5e1";
      eventColorLabel.textContent = "Select a user";
      return;
    }

    eventColorSwatch.style.backgroundColor = selectedProfile.color;
    eventColorLabel.innerHTML = '<i class="bi ' + (selectedProfile.icon || "bi-person-fill") + ' me-2"></i>' + selectedProfile.name + " theme";
  }

  function updateUserFilterLabel() {
    if (!userFilterToggleButton) {
      return;
    }

    var selectedProfiles = state.profiles.filter(function (profile) {
      return state.activeProfileIds[profile.id] !== false;
    });
    var selectedCount = selectedProfiles.length;

    if (!selectedCount || selectedCount === state.profiles.length) {
      userFilterToggleButton.textContent = "Everyone";
      return;
    }

    if (selectedCount === 1) {
      userFilterToggleButton.textContent = selectedProfiles[0].name;
      return;
    }

    userFilterToggleButton.textContent = selectedCount + " people";
  }

  function renderFilters() {
    filtersElement.innerHTML = state.profiles.map(function (profile) {
      if (typeof state.activeProfileIds[profile.id] === "undefined") {
        state.activeProfileIds[profile.id] = true;
      }

      return [
        '<label class="calendar-filter-option">',
        '<input class="form-check-input calendar-filter-input" type="checkbox" value="', profile.id, '"',
        state.activeProfileIds[profile.id] ? " checked" : "",
        ">",
        '<span class="legend-dot" style="background:', profile.color, '"></span>',
        '<i class="bi ', profile.icon || "bi-person-fill", ' calendar-filter-icon"></i>',
        '<span>', profile.name, "</span>",
        "</label>"
      ].join("");
    }).join("");

    updateUserFilterLabel();
  }

  function setUserFilterMenuExpanded(isExpanded) {
    if (!userFilterToggleButton || !userFilterMenu) {
      return;
    }

    userFilterToggleButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    userFilterMenu.classList.toggle("is-hidden", !isExpanded);
  }

  function setAllFilters(nextValue) {
    state.profiles.forEach(function (profile) {
      state.activeProfileIds[profile.id] = nextValue;
    });

    refreshCalendar();
  }

  function renderPanelItems(targetElement, items, emptyMessage) {
    if (!targetElement) {
      return;
    }

    if (!items.length) {
      targetElement.innerHTML = '<div class="dashboard-empty-state">' + emptyMessage + "</div>";
      return;
    }

    targetElement.innerHTML = items.map(function (item) {
      var meta = [];

      meta.push('<span class="dashboard-item-category">' + item.category + "</span>");

      if (item.person) {
        meta.push('<span class="dashboard-item-meta">' + item.person + "</span>");
      }

      if (item.time) {
        meta.push('<span class="dashboard-item-meta">' + formatTime(item.time) + "</span>");
      }

      if (item.label) {
        meta.push('<span class="dashboard-item-meta">' + item.label + "</span>");
      }

      if (item.repeat) {
        meta.push('<span class="dashboard-item-meta">' + item.repeat + "</span>");
      }

      return [
        '<button class="dashboard-item" type="button" data-item-id="', item.id, '" data-item-type="', item.type, '">',
        '<span class="dashboard-item-marker" style="background:', item.color, '"></span>',
        '<span class="dashboard-item-content">',
        '<span class="dashboard-item-title">', item.title, "</span>",
        '<span class="dashboard-item-subtitle">', formatDate(item.date || item.dueDate), "</span>",
        '<span class="dashboard-item-meta-row">', meta.join(""), "</span>",
        "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderTodayPanel() {
    var todayString = new Date().toISOString().slice(0, 10);
    var todayItems = getCombinedItemsForDate(todayString);

    if (todayPanelDate) {
      todayPanelDate.textContent = formatHeading(todayString);
    }

    renderPanelItems(todayEventsElement, todayItems, "No events today.");
  }

  function renderUpcomingReminders() {
    var todayString = new Date().toISOString().slice(0, 10);
    var reminders = state.showMaintenanceItems ? sortByDateTime(getReminderItems().filter(function (item) {
      return item.date >= todayString;
    })).slice(0, 6) : [];

    renderPanelItems(upcomingRemindersElement, reminders, "No upcoming reminders.");
  }

  function updateMaintenanceToggleState() {
    if (!maintenanceFilterToggleButton) {
      return;
    }

    maintenanceFilterToggleButton.setAttribute("aria-pressed", state.showMaintenanceItems ? "true" : "false");
    maintenanceFilterToggleButton.classList.toggle("is-active", state.showMaintenanceItems);
  }

  function renderColorPalette() {
    profileColorPalette.innerHTML = colorOptions.map(function (color) {
      return '<button class="color-palette-button' + (profileColorInput.value === color ? " is-selected" : "") + '" type="button" data-color="' + color + '" style="background:' + color + '"></button>';
    }).join("");
  }

  function renderIconPicker() {
    profileIconPicker.innerHTML = iconOptions.map(function (iconClass) {
      return '<button class="icon-picker-button' + (profileIconInput.value === iconClass ? " is-selected" : "") + '" type="button" data-icon="' + iconClass + '"><i class="bi ' + iconClass + '"></i></button>';
    }).join("");
  }

  function resetEventForm() {
    state.editingEventId = null;
    eventForm.reset();
    hideFormError(eventFormError);
    deleteEventButton.classList.add("d-none");

    if (state.selectedDate) {
      eventDateTimeInput.value = buildDateTimeValue(state.selectedDate, "");
    }

    if (state.profiles[0]) {
      eventPersonInput.value = state.profiles[0].id;
    }

    if (eventCategoryInput) {
      eventCategoryInput.value = "Family";
    }

    eventFormHeading.textContent = "New calendar event";
    eventFormCopy.textContent = "Add an event and it will appear on the dashboard right away.";
    saveEventButton.textContent = "Save event";
    updateEventColorPreview();
  }

  function beginEditEvent(eventData) {
    state.editingEventId = eventData.id;
    eventTitleInput.value = eventData.title;
    eventDateTimeInput.value = buildDateTimeValue(eventData.date, eventData.time);
    eventPersonInput.value = eventData.profileId;
    eventCategoryInput.value = eventData.category || "Family";
    eventFormHeading.textContent = "Edit calendar event";
    eventFormCopy.textContent = "Update the details below and save your changes.";
    saveEventButton.textContent = "Update event";
    deleteEventButton.classList.remove("d-none");
    updateEventColorPreview();
    setModalVisibility(eventModal, true);
    eventTitleInput.focus();
  }

  function resetProfileForm() {
    state.editingProfileId = null;
    userForm.reset();
    profileColorInput.value = "#4285f4";
    profileIconInput.value = "bi-person-fill";
    saveProfileButton.textContent = "Save user";
    hideFormError(userFormError);
    renderColorPalette();
    renderIconPicker();
  }

  function beginEditProfile(profile) {
    state.editingProfileId = profile.id;
    profileNameInput.value = profile.name;
    profileColorInput.value = profile.color;
    profileIconInput.value = profile.icon || "bi-person-fill";
    saveProfileButton.textContent = "Update user";
    renderColorPalette();
    renderIconPicker();
    setModalVisibility(userModal, true);
    profileNameInput.focus();
  }

  function renderProfileList() {
    userProfileList.innerHTML = state.profiles.map(function (profile) {
      return [
        '<div class="user-profile-item">',
        '<div class="user-profile-meta">',
        '<span class="user-theme-dot" style="background:', profile.color, '"></span>',
        '<i class="bi ', profile.icon || "bi-person-fill", ' user-profile-icon"></i>',
        '<span class="user-profile-name">', profile.name, "</span>",
        "</div>",
        '<div class="user-profile-actions">',
        '<button class="btn btn-sm btn-outline-secondary profile-edit-button" type="button" data-profile-id="', profile.id, '">Edit</button>',
        '<button class="btn btn-sm btn-outline-danger profile-delete-button" type="button" data-profile-id="', profile.id, '">Delete</button>',
        "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function refreshCalendar() {
    if (!calendar) {
      return;
    }

    calendar.removeAllEvents();
    buildCalendarEntries().forEach(function (entry) {
      calendar.addEvent(entry);
    });
    renderFilters();
    renderProfileSelect();
    renderProfileList();
    renderTodayPanel();
    renderUpcomingReminders();
    updateMaintenanceToggleState();
  }

  function openDetailsModalForDate(dateString) {
    var items = getCombinedItemsForDate(dateString);

    state.detailsDate = dateString;
    detailsHeading.textContent = formatHeading(dateString);
    detailsCopy.textContent = items.length ? "Events and reminders scheduled for this date." : "Nothing is scheduled yet for this date.";
    detailsAddButton.classList.remove("d-none");
    renderPanelItems(detailsBody, items, "No items scheduled for this date.");
    setModalVisibility(detailsModal, true);
  }

  function openDetailsModalForReminder(reminder) {
    state.detailsDate = reminder.dueDate;
    detailsHeading.textContent = reminder.title;
    detailsCopy.textContent = "Home maintenance reminder";
    detailsAddButton.classList.add("d-none");
    detailsBody.innerHTML = [
      '<div class="details-list-item"><span class="details-label">Category</span><span class="details-value">', reminder.category || "House maintenance", "</span></div>",
      '<div class="details-list-item"><span class="details-label">Due date</span><span class="details-value">', formatHeading(reminder.dueDate), "</span></div>",
      '<div class="details-list-item"><span class="details-label">Repeat</span><span class="details-value">', reminder.repeat || "One-time", "</span></div>",
      '<div class="details-list-item"><span class="details-label">Reminder</span><span class="details-value">', reminder.reminder || "None", "</span></div>",
      '<div class="details-list-item"><span class="details-label">Source</span><span class="details-value">Home Maintenance</span></div>'
    ].join("");
    setModalVisibility(detailsModal, true);
  }

  function showDataError(message) {
    var text = message || "The shared household data could not be loaded.";

    if (todayPanelDate) {
      todayPanelDate.textContent = "Shared data unavailable";
    }

    if (todayEventsElement) {
      todayEventsElement.innerHTML = '<div class="dashboard-empty-state">' + text + "</div>";
    }

    if (upcomingRemindersElement) {
      upcomingRemindersElement.innerHTML = '<div class="dashboard-empty-state">' + text + "</div>";
    }

    if (calendarElement) {
      calendarElement.innerHTML = '<div class="dashboard-empty-state">' + text + "</div>";
    }
  }

  async function loadHouseholdData() {
    var context = await dataApi.getHouseholdContext();
    var results = await Promise.all([
      dataApi.fetchProfiles(),
      dataApi.fetchEvents(),
      dataApi.fetchMaintenanceReminders()
    ]);

    state.household = context.household;
    state.profiles = results[0].map(function (profile) {
      return {
        id: profile.id,
        name: profile.name,
        color: profile.color || "#4285f4",
        icon: profile.icon || "bi-person-fill"
      };
    });
    state.reminders = results[2].map(function (reminder) {
      return {
        id: reminder.id,
        title: reminder.title,
        category: reminder.category || "House maintenance",
        dueDate: reminder.due_date,
        repeat: reminder.repeat_rule || "",
        reminder: reminder.reminder_notice || "",
        color: reminder.color || reminderColor
      };
    });
    normalizeEvents(results[1]);
    refreshCalendar();
    resetEventForm();
    resetProfileForm();
  }

  function initializeCalendar() {
    calendar = new FullCalendar.Calendar(calendarElement, {
      initialView: "dayGridMonth",
      height: "auto",
      fixedWeekCount: false,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: ""
      },
      buttonText: {
        today: "Today"
      },
      events: [],
      eventDidMount: function (info) {
        var descriptor = info.event.extendedProps.itemType === "reminder" ? "Reminder" : info.event.extendedProps.category;
        var timeText = info.event.extendedProps.time ? formatTime(info.event.extendedProps.time) + " - " : "";
        var fullText = timeText + info.event.title + " (" + descriptor + ")";

        info.el.setAttribute("title", fullText);
        info.el.style.backgroundColor = info.event.backgroundColor;
        info.el.style.borderColor = info.event.borderColor;
        info.el.style.color = "#ffffff";
      },
      dayMaxEventRows: 3,
      dateClick: function (info) {
        state.selectedDate = info.dateStr;
        eventDateTimeInput.value = buildDateTimeValue(info.dateStr, "");
        openDetailsModalForDate(info.dateStr);
      },
      eventClick: function (info) {
        if (info.event.extendedProps.itemType === "reminder") {
          var reminder = findReminderById(info.event.id);

          if (reminder) {
            openDetailsModalForReminder(reminder);
          }
          return;
        }

        var clickedEvent = findEventById(info.event.id);

        if (clickedEvent) {
          beginEditEvent(clickedEvent);
        }
      }
    });

    calendar.render();
  }

  function handleDashboardItemClick(clickEvent) {
    var itemButton = clickEvent.target.closest(".dashboard-item");

    if (!itemButton) {
      return;
    }

    if (itemButton.getAttribute("data-item-type") === "reminder") {
      var reminder = findReminderById(itemButton.getAttribute("data-item-id"));

      if (reminder) {
        openDetailsModalForReminder(reminder);
      }
      return;
    }

    var eventToEdit = findEventById(itemButton.getAttribute("data-item-id"));

    if (eventToEdit) {
      beginEditEvent(eventToEdit);
    }
  }

  initializeCalendar();
  renderColorPalette();
  renderIconPicker();
  setUserFilterMenuExpanded(false);
  updateMaintenanceToggleState();

  loadHouseholdData().catch(function (error) {
    showDataError(error && error.message ? error.message : "");
  });

  openEventFormButton.addEventListener("click", function () {
    resetEventForm();
    setModalVisibility(eventModal, true);
    eventTitleInput.focus();
  });

  openUserFormButton.addEventListener("click", function () {
    resetProfileForm();
    setModalVisibility(userModal, true);
    profileNameInput.focus();
  });

  if (userFilterToggleButton) {
    userFilterToggleButton.addEventListener("click", function () {
      var isExpanded = userFilterToggleButton.getAttribute("aria-expanded") === "true";
      setUserFilterMenuExpanded(!isExpanded);
    });
  }

  if (userFilterSelectAllButton) {
    userFilterSelectAllButton.addEventListener("click", function () {
      setAllFilters(true);
    });
  }

  if (userFilterClearButton) {
    userFilterClearButton.addEventListener("click", function () {
      setAllFilters(false);
    });
  }

  if (maintenanceFilterToggleButton) {
    maintenanceFilterToggleButton.addEventListener("click", function () {
      state.showMaintenanceItems = !state.showMaintenanceItems;
      refreshCalendar();
    });
  }

  if (detailsAddButton) {
    detailsAddButton.addEventListener("click", function () {
      if (!state.detailsDate) {
        return;
      }

      state.selectedDate = state.detailsDate;
      resetEventForm();
      eventDateTimeInput.value = buildDateTimeValue(state.detailsDate, "");
      setModalVisibility(detailsModal, false);
      setModalVisibility(eventModal, true);
      eventTitleInput.focus();
    });
  }

  eventPersonInput.addEventListener("change", updateEventColorPreview);

  profileColorPalette.addEventListener("click", function (clickEvent) {
    var colorButton = clickEvent.target.closest(".color-palette-button");

    if (!colorButton) {
      return;
    }

    profileColorInput.value = colorButton.getAttribute("data-color");
    renderColorPalette();
  });

  profileIconPicker.addEventListener("click", function (clickEvent) {
    var iconButton = clickEvent.target.closest(".icon-picker-button");

    if (!iconButton) {
      return;
    }

    profileIconInput.value = iconButton.getAttribute("data-icon");
    renderIconPicker();
  });

  filtersElement.addEventListener("change", function (changeEvent) {
    var filterInput = changeEvent.target.closest(".calendar-filter-input");

    if (!filterInput) {
      return;
    }

    state.activeProfileIds[filterInput.value] = filterInput.checked;
    refreshCalendar();
  });

  document.addEventListener("click", function (clickEvent) {
    if (!userFilterDropdown) {
      return;
    }

    if (!userFilterDropdown.contains(clickEvent.target)) {
      setUserFilterMenuExpanded(false);
    }
  });

  if (todayEventsElement) {
    todayEventsElement.addEventListener("click", handleDashboardItemClick);
  }

  if (upcomingRemindersElement) {
    upcomingRemindersElement.addEventListener("click", handleDashboardItemClick);
  }

  if (detailsBody) {
    detailsBody.addEventListener("click", handleDashboardItemClick);
  }

  eventForm.addEventListener("submit", async function (submitEvent) {
    submitEvent.preventDefault();
    hideFormError(eventFormError);

    var selectedProfile = getProfileById(eventPersonInput.value);
    var selectedDateTime = eventDateTimeInput.value;
    var selectedDateObject = selectedDateTime ? new Date(selectedDateTime) : null;
    var dateParts = splitDateTimeValue(selectedDateTime);

    if (!selectedProfile) {
      showFormError(eventFormError, "Please select a user profile.");
      return;
    }

    if (!selectedDateObject || Number.isNaN(selectedDateObject.getTime())) {
      showFormError(eventFormError, "Please enter a valid date and time.");
      return;
    }

    if (!eventTitleInput.value.trim()) {
      showFormError(eventFormError, "Please complete the event title.");
      return;
    }

    try {
      if (state.editingEventId) {
        await dataApi.updateEvent(state.editingEventId, {
          profileId: selectedProfile.id,
          title: eventTitleInput.value.trim(),
          category: eventCategoryInput.value || "Family",
          date: dateParts.date,
          time: dateParts.time
        });
      } else {
        await dataApi.createEvent({
          profileId: selectedProfile.id,
          title: eventTitleInput.value.trim(),
          category: eventCategoryInput.value || "Family",
          date: dateParts.date,
          time: dateParts.time
        });
      }

      state.selectedDate = dateParts.date;
      await loadHouseholdData();
      setModalVisibility(eventModal, false);
    } catch (error) {
      showFormError(eventFormError, error && error.message ? error.message : "Could not save the event.");
    }
  });

  userForm.addEventListener("submit", async function (submitEvent) {
    submitEvent.preventDefault();
    hideFormError(userFormError);

    var profileName = profileNameInput.value.trim();
    var duplicateProfile = state.profiles.find(function (profile) {
      return profile.name.toLowerCase() === profileName.toLowerCase() && profile.id !== state.editingProfileId;
    });

    if (!profileName) {
      showFormError(userFormError, "Please enter a user name.");
      return;
    }

    if (duplicateProfile) {
      showFormError(userFormError, "That user name already exists.");
      return;
    }

    try {
      if (state.editingProfileId) {
        await dataApi.updateProfile(state.editingProfileId, {
          name: profileName,
          color: profileColorInput.value,
          icon: profileIconInput.value || "bi-person-fill"
        });
      } else {
        await dataApi.createProfile({
          name: profileName,
          color: profileColorInput.value,
          icon: profileIconInput.value || "bi-person-fill"
        });
      }

      await loadHouseholdData();
      setModalVisibility(userModal, false);
    } catch (error) {
      showFormError(userFormError, error && error.message ? error.message : "Could not save the user.");
    }
  });

  if (deleteEventButton) {
    deleteEventButton.addEventListener("click", async function () {
      if (!state.editingEventId) {
        return;
      }

      try {
        await dataApi.deleteEvent(state.editingEventId);
        await loadHouseholdData();
        setModalVisibility(eventModal, false);
      } catch (error) {
        showFormError(eventFormError, error && error.message ? error.message : "Could not delete the event.");
      }
    });
  }

  userProfileList.addEventListener("click", async function (clickEvent) {
    var editButton = clickEvent.target.closest(".profile-edit-button");
    var deleteButton = clickEvent.target.closest(".profile-delete-button");

    if (editButton) {
      var profileToEdit = getProfileById(editButton.getAttribute("data-profile-id"));

      if (profileToEdit) {
        beginEditProfile(profileToEdit);
      }
      return;
    }

    if (deleteButton) {
      var profileId = deleteButton.getAttribute("data-profile-id");
      var hasAssignedEvents = state.events.some(function (event) {
        return event.profileId === profileId;
      });

      if (hasAssignedEvents) {
        showFormError(userFormError, "You cannot delete a user who still has events assigned.");
        return;
      }

      try {
        await dataApi.deleteProfile(profileId);
        delete state.activeProfileIds[profileId];
        await loadHouseholdData();
      } catch (error) {
        showFormError(userFormError, error && error.message ? error.message : "Could not delete the user.");
      }
    }
  });

  if (eventModalElement) {
    eventModalElement.addEventListener("hidden.bs.modal", function () {
      resetEventForm();
    });
  }

  if (userModalElement) {
    userModalElement.addEventListener("hidden.bs.modal", function () {
      resetProfileForm();
    });
  }
})();
