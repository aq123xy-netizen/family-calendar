(function () {
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
  var downloadProfilesButton = document.getElementById("download-profiles-button");

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

  var profilesStorageKey = "family-calendar-profiles";
  var eventsStorageKey = "family-calendar-events";
  var maintenanceStorageKey = "family-calendar-maintenance";
  var editingEventId = null;
  var editingProfileId = null;
  var selectedDate = null;
  var detailsDate = null;
  var activeProfileIds = {};
  var showMaintenanceItems = true;
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

  var eventModal = eventModalElement && window.bootstrap ? new window.bootstrap.Modal(eventModalElement) : null;
  var userModal = userModalElement && window.bootstrap ? new window.bootstrap.Modal(userModalElement) : null;
  var detailsModal = detailsModalElement && window.bootstrap ? new window.bootstrap.Modal(detailsModalElement) : null;

  if (!calendarElement || !window.FullCalendar) {
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

  function makeId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
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

  function loadStoredCollection(storageKey) {
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

  function sortMaintenanceItems(items) {
    return items.slice().sort(function (left, right) {
      return left.dueDate.localeCompare(right.dueDate);
    });
  }

  function sortByDateTime(items) {
    return items.slice().sort(function (left, right) {
      var leftValue = (left.date || left.dueDate) + "T" + (left.time || "23:59");
      var rightValue = (right.date || right.dueDate) + "T" + (right.time || "23:59");

      return leftValue.localeCompare(rightValue);
    });
  }

  Promise.all([
    fetch("assets/events.json").then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load events.json");
      }

      return response.json();
    }),
    fetch("assets/profiles.json").then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load profiles.json");
      }

      return response.json();
    }),
    fetch("assets/home-maintenance.json").then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load home-maintenance.json");
      }

      return response.json();
    })
  ])
    .then(function (results) {
      var eventSeeds = loadStoredCollection(eventsStorageKey) || results[0];
      var profileSeeds = loadStoredCollection(profilesStorageKey) || results[1];
      var maintenanceTasks = sortMaintenanceItems(loadStoredCollection(maintenanceStorageKey) || results[2]);
      var profiles = profileSeeds.map(function (profile, index) {
        return {
          id: profile.id || "profile-seed-" + (index + 1),
          name: profile.name,
          color: profile.color || "#4285f4",
          icon: profile.icon || "bi-person-fill"
        };
      });
      var events = eventSeeds.map(function (event, index) {
        return {
          id: event.id || "seed-" + (index + 1),
          title: event.title,
          date: event.date,
          time: event.time || "",
          profileId: event.profileId || "",
          person: event.person,
          color: event.color || "#4285f4",
          icon: event.icon || "bi-person-fill",
          category: event.category || "Family"
        };
      });
      var calendar;

      function getProfileById(profileId) {
        return profiles.find(function (profile) {
          return profile.id === profileId;
        }) || null;
      }

      function getProfileByName(name) {
        return profiles.find(function (profile) {
          return profile.name.toLowerCase() === String(name || "").toLowerCase();
        }) || null;
      }

      function normalizeEvents() {
        events = events.map(function (event) {
          var matchedProfile = getProfileById(event.profileId) || getProfileByName(event.person);

          if (!matchedProfile && event.person) {
            matchedProfile = {
              id: makeId("profile"),
              name: event.person,
              color: event.color || "#4285f4",
              icon: "bi-person-fill"
            };
            profiles.push(matchedProfile);
          }

          return {
            id: event.id || makeId("event"),
            title: event.title,
            date: event.date,
            time: event.time || "",
            profileId: matchedProfile ? matchedProfile.id : (event.profileId || ""),
            person: matchedProfile ? matchedProfile.name : event.person,
            color: matchedProfile ? matchedProfile.color : (event.color || "#4285f4"),
            icon: matchedProfile ? matchedProfile.icon : (event.icon || "bi-person-fill"),
            category: event.category || "Family"
          };
        });
      }

      function getReminderItems() {
        return sortMaintenanceItems(maintenanceTasks).map(function (task) {
          return {
            id: task.id,
            title: task.title,
            date: task.dueDate,
            dueDate: task.dueDate,
            time: "",
            category: task.category || "House maintenance",
            repeat: task.repeat || "",
            reminder: task.reminder || "",
            source: task.source || "home-maintenance",
            color: task.color || reminderColor,
            type: "reminder",
            label: "Reminder due"
          };
        });
      }

      normalizeEvents();

      function isProfileVisible(profileId) {
        if (!profileId) {
          return true;
        }

        return activeProfileIds[profileId] !== false;
      }

      function getVisibleEvents() {
        return events.filter(function (event) {
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
        var reminders = showMaintenanceItems ? getReminderItems().filter(function (item) {
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
        var reminderEntries = showMaintenanceItems ? getReminderItems().map(function (item) {
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
        eventPersonInput.innerHTML = profiles.map(function (profile) {
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

      function renderFilters() {
        filtersElement.innerHTML = profiles.map(function (profile) {
          if (typeof activeProfileIds[profile.id] === "undefined") {
            activeProfileIds[profile.id] = true;
          }

          return [
            '<label class="calendar-filter-option">',
            '<input class="form-check-input calendar-filter-input" type="checkbox" value="', profile.id, '"',
            activeProfileIds[profile.id] ? " checked" : "",
            ">",
            '<span class="legend-dot" style="background:', profile.color, '"></span>',
            '<i class="bi ', profile.icon || "bi-person-fill", ' calendar-filter-icon"></i>',
            '<span>', profile.name, "</span>",
            "</label>"
          ].join("");
        }).join("");

        updateUserFilterLabel();
      }

      function updateUserFilterLabel() {
        if (!userFilterToggleButton) {
          return;
        }

        var selectedProfiles = profiles.filter(function (profile) {
          return activeProfileIds[profile.id] !== false;
        });
        var selectedCount = selectedProfiles.length;

        if (selectedCount === profiles.length) {
          userFilterToggleButton.textContent = "Everyone";
          return;
        }

        if (selectedCount === 1) {
          userFilterToggleButton.textContent = selectedProfiles[0].name;
          return;
        }

        userFilterToggleButton.textContent = selectedCount + " people";
      }

      function setUserFilterMenuExpanded(isExpanded) {
        if (!userFilterToggleButton || !userFilterMenu) {
          return;
        }

        userFilterToggleButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        userFilterMenu.classList.toggle("is-hidden", !isExpanded);
      }

      function setAllFilters(nextValue) {
        profiles.forEach(function (profile) {
          activeProfileIds[profile.id] = nextValue;
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
        var reminders = showMaintenanceItems ? sortByDateTime(getReminderItems().filter(function (item) {
          return item.date >= todayString;
        })).slice(0, 6) : [];

        renderPanelItems(upcomingRemindersElement, reminders, "No upcoming reminders.");
      }

      function updateMaintenanceToggleState() {
        if (!maintenanceFilterToggleButton) {
          return;
        }

        maintenanceFilterToggleButton.setAttribute("aria-pressed", showMaintenanceItems ? "true" : "false");
        maintenanceFilterToggleButton.classList.toggle("is-active", showMaintenanceItems);
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
        editingEventId = null;
        eventForm.reset();
        hideFormError(eventFormError);
        deleteEventButton.classList.add("d-none");

        if (selectedDate) {
          eventDateTimeInput.value = buildDateTimeValue(selectedDate, "");
        }

        if (profiles[0]) {
          eventPersonInput.value = profiles[0].id;
        }

        if (eventCategoryInput) {
          eventCategoryInput.value = "Family";
        }

        eventFormHeading.textContent = "New calendar item";
        eventFormCopy.textContent = "Add an event and it will appear on the dashboard right away.";
        saveEventButton.textContent = "Save item";
        updateEventColorPreview();
      }

      function beginEditEvent(eventData) {
        editingEventId = eventData.id;
        eventTitleInput.value = eventData.title;
        eventDateTimeInput.value = buildDateTimeValue(eventData.date, eventData.time);
        eventPersonInput.value = eventData.profileId;
        eventCategoryInput.value = eventData.category || "Family";
        eventFormHeading.textContent = "Edit calendar item";
        eventFormCopy.textContent = "Update the details below and save your changes.";
        saveEventButton.textContent = "Update item";
        deleteEventButton.classList.remove("d-none");
        updateEventColorPreview();
        setModalVisibility(eventModal, true);
        eventTitleInput.focus();
      }

      function resetProfileForm() {
        editingProfileId = null;
        userForm.reset();
        profileColorInput.value = "#4285f4";
        profileIconInput.value = "bi-person-fill";
        saveProfileButton.textContent = "Save user";
        hideFormError(userFormError);
        renderColorPalette();
        renderIconPicker();
      }

      function beginEditProfile(profile) {
        editingProfileId = profile.id;
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
        userProfileList.innerHTML = profiles.map(function (profile) {
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

      function findEventById(id) {
        return events.find(function (event) {
          return event.id === id;
        }) || null;
      }

      function findReminderById(id) {
        return maintenanceTasks.find(function (task) {
          return task.id === id;
        }) || null;
      }

      function findEventIndexById(id) {
        return events.findIndex(function (event) {
          return event.id === id;
        });
      }

      function getExportableEvents() {
        return events.map(function (event) {
          return {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time || "",
            profileId: event.profileId,
            category: event.category || "Family"
          };
        });
      }

      function getExportableProfiles() {
        return profiles.map(function (profile) {
          return {
            id: profile.id,
            name: profile.name,
            color: profile.color,
            icon: profile.icon || "bi-person-fill"
          };
        });
      }

      function persistCalendarData() {
        localStorage.setItem(eventsStorageKey, JSON.stringify(getExportableEvents()));
        localStorage.setItem(profilesStorageKey, JSON.stringify(getExportableProfiles()));
      }

      function refreshCalendar() {
        calendar.removeAllEvents();
        buildCalendarEntries().forEach(function (event) {
          calendar.addEvent(event);
        });

        renderFilters();
        renderProfileSelect();
        renderProfileList();
        renderTodayPanel();
        renderUpcomingReminders();
        updateMaintenanceToggleState();
      }

      function saveProfilesToBrowser() {
        persistCalendarData();

        if (downloadProfilesButton) {
          downloadProfilesButton.textContent = "Saved";

          window.setTimeout(function () {
            downloadProfilesButton.textContent = "Save profile changes";
          }, 1500);
        }
      }

      function openDetailsModalForDate(dateString) {
        var items = getCombinedItemsForDate(dateString);

        detailsDate = dateString;
        detailsHeading.textContent = formatHeading(dateString);
        detailsCopy.textContent = items.length ? "Events and reminders scheduled for this date." : "Nothing is scheduled yet for this date.";
        detailsAddButton.classList.remove("d-none");
        renderPanelItems(detailsBody, items, "No items scheduled for this date.");
        setModalVisibility(detailsModal, true);
      }

      function openDetailsModalForReminder(reminder) {
        detailsDate = reminder.dueDate;
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
        events: buildCalendarEntries(),
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
          selectedDate = info.dateStr;
          eventDateTimeInput.value = buildDateTimeValue(info.dateStr, "");
          openDetailsModalForDate(info.dateStr);
        },
        eventClick: function (info) {
          var itemType = info.event.extendedProps.itemType;

          if (itemType === "reminder") {
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
      selectedDate = new Date().toISOString().slice(0, 10);

      renderFilters();
      renderProfileSelect();
      renderProfileList();
      renderColorPalette();
      renderIconPicker();
      renderTodayPanel();
      renderUpcomingReminders();
      resetEventForm();
      resetProfileForm();
      setUserFilterMenuExpanded(false);
      updateMaintenanceToggleState();

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

      if (downloadProfilesButton) {
        downloadProfilesButton.addEventListener("click", function () {
          saveProfilesToBrowser();
        });
      }

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
          showMaintenanceItems = !showMaintenanceItems;
          refreshCalendar();
        });
      }

      if (detailsAddButton) {
        detailsAddButton.addEventListener("click", function () {
          if (!detailsDate) {
            return;
          }

          selectedDate = detailsDate;
          resetEventForm();
          eventDateTimeInput.value = buildDateTimeValue(detailsDate, "");
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

        activeProfileIds[filterInput.value] = filterInput.checked;
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

      function handleDashboardItemClick(clickEvent) {
        var itemButton = clickEvent.target.closest(".dashboard-item");

        if (!itemButton) {
          return;
        }

        var itemType = itemButton.getAttribute("data-item-type");
        var itemId = itemButton.getAttribute("data-item-id");

        if (itemType === "reminder") {
          var reminder = findReminderById(itemId);

          if (reminder) {
            openDetailsModalForReminder(reminder);
          }

          return;
        }

        var eventToEdit = findEventById(itemId);

        if (eventToEdit) {
          beginEditEvent(eventToEdit);
        }
      }

      if (todayEventsElement) {
        todayEventsElement.addEventListener("click", handleDashboardItemClick);
      }

      if (upcomingRemindersElement) {
        upcomingRemindersElement.addEventListener("click", handleDashboardItemClick);
      }

      if (detailsBody) {
        detailsBody.addEventListener("click", handleDashboardItemClick);
      }

      eventForm.addEventListener("submit", function (submitEvent) {
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

        var eventData = {
          id: editingEventId || makeId("event"),
          title: eventTitleInput.value.trim(),
          date: dateParts.date,
          time: dateParts.time,
          profileId: selectedProfile.id,
          person: selectedProfile.name,
          color: selectedProfile.color,
          icon: selectedProfile.icon || "bi-person-fill",
          category: eventCategoryInput.value || "Family"
        };

        if (!eventData.title || !eventData.date) {
          showFormError(eventFormError, "Please complete the item title and date.");
          return;
        }

        var eventIndex = findEventIndexById(eventData.id);

        if (eventIndex >= 0) {
          events[eventIndex] = eventData;
        } else {
          events.push(eventData);
        }

        selectedDate = eventData.date;
        refreshCalendar();
        persistCalendarData();
        resetEventForm();
        setModalVisibility(eventModal, false);
      });

      userForm.addEventListener("submit", function (submitEvent) {
        submitEvent.preventDefault();
        hideFormError(userFormError);

        var profileName = profileNameInput.value.trim();
        var duplicateProfile = profiles.find(function (profile) {
          return profile.name.toLowerCase() === profileName.toLowerCase() && profile.id !== editingProfileId;
        });

        if (!profileName) {
          showFormError(userFormError, "Please enter a user name.");
          return;
        }

        if (duplicateProfile) {
          showFormError(userFormError, "That user name already exists.");
          return;
        }

        if (editingProfileId) {
          profiles = profiles.map(function (profile) {
            if (profile.id !== editingProfileId) {
              return profile;
            }

            return {
              id: profile.id,
              name: profileName,
              color: profileColorInput.value,
              icon: profileIconInput.value || "bi-person-fill"
            };
          });
        } else {
          var newProfile = {
            id: makeId("profile"),
            name: profileName,
            color: profileColorInput.value,
            icon: profileIconInput.value || "bi-person-fill"
          };
          profiles.push(newProfile);
          activeProfileIds[newProfile.id] = true;
        }

        normalizeEvents();
        refreshCalendar();
        persistCalendarData();
        resetProfileForm();
        setModalVisibility(userModal, false);
      });

      if (deleteEventButton) {
        deleteEventButton.addEventListener("click", function () {
          if (!editingEventId) {
            return;
          }

          events = events.filter(function (event) {
            return event.id !== editingEventId;
          });
          refreshCalendar();
          persistCalendarData();
          resetEventForm();
          setModalVisibility(eventModal, false);
        });
      }

      userProfileList.addEventListener("click", function (clickEvent) {
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
          var hasAssignedEvents = events.some(function (event) {
            return event.profileId === profileId;
          });

          if (hasAssignedEvents) {
            showFormError(userFormError, "You cannot delete a user who still has events assigned.");
            return;
          }

          profiles = profiles.filter(function (profile) {
            return profile.id !== profileId;
          });
          delete activeProfileIds[profileId];
          refreshCalendar();
          persistCalendarData();
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
    })
    .catch(function () {
      if (todayPanelDate) {
        todayPanelDate.textContent = "Dashboard unavailable";
      }

      if (todayEventsElement) {
        todayEventsElement.innerHTML = '<div class="dashboard-empty-state">The dashboard data files could not be loaded.</div>';
      }

      if (upcomingRemindersElement) {
        upcomingRemindersElement.innerHTML = '<div class="dashboard-empty-state">The reminder data files could not be loaded.</div>';
      }
    });
})();
