(function () {
  var calendarElement = document.getElementById("calendar");
  var legendElement = document.getElementById("calendar-legend");
  var filtersElement = document.getElementById("calendar-filters");
  var selectedDateTitle = document.getElementById("selected-date-title");
  var selectedDateEvents = document.getElementById("selected-date-events");
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
  var profilesStorageKey = "family-calendar-profiles";
  var eventsStorageKey = "family-calendar-events";

  var editingEventId = null;
  var editingProfileId = null;
  var selectedDate = null;
  var activeProfileIds = {};
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
  var eventModal = eventModalElement && window.bootstrap ? new window.bootstrap.Modal(eventModalElement) : null;
  var userModal = userModalElement && window.bootstrap ? new window.bootstrap.Modal(userModalElement) : null;

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

  function downloadJson(filename, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
    })
  ])
    .then(function (results) {
      var eventSeeds = loadStoredCollection(eventsStorageKey) || results[0];
      var profileSeeds = loadStoredCollection(profilesStorageKey) || results[1];
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
          color: event.color || "#4285f4"
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
            icon: matchedProfile ? matchedProfile.icon : "bi-person-fill"
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

      function getEventsForDate(dateString) {
        return getVisibleEvents().filter(function (event) {
          return event.date === dateString;
        });
      }

      function buildCalendarEvents(sourceEvents) {
        return sourceEvents.map(function (event) {
          return {
            id: event.id,
            title: event.title,
            start: event.time ? event.date + "T" + event.time : event.date,
            allDay: !event.time,
            backgroundColor: event.color,
            borderColor: event.color,
            extendedProps: {
              profileId: event.profileId,
              person: event.person,
              color: event.color,
              icon: event.icon || "bi-person-fill",
              time: event.time || ""
            }
          };
        });
      }

      function renderLegend() {
        legendElement.innerHTML = profiles.map(function (profile) {
          return [
            '<span class="legend-chip">',
            '<span class="legend-dot" style="background:', profile.color, '"></span>',
            '<i class="bi ', profile.icon || "bi-person-fill", ' legend-icon"></i>',
            profile.name,
            "</span>"
          ].join("");
        }).join("");
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
      }

      function renderSelectedDate(dateString, dayEvents) {
        selectedDate = dateString;
        if (!selectedDateTitle || !selectedDateEvents) {
          return;
        }

        selectedDateTitle.textContent = formatHeading(dateString);

        if (!dayEvents.length) {
          selectedDateEvents.innerHTML = '<p class="text-secondary mb-0">No events scheduled for this day.</p>';
          return;
        }

        selectedDateEvents.innerHTML = dayEvents.map(function (event) {
          return [
            '<div class="selected-event-item" data-event-id="', event.id, '">',
            '<div class="selected-event-body">',
            '<span class="selected-event-dot" style="background:', event.color, '"></span>',
            '<div>',
            '<div class="selected-event-person"><i class="bi ', event.icon || "bi-person-fill", ' selected-event-icon me-1"></i>', event.person, "</div>",
            '<div class="selected-event-title">', event.title, "</div>",
            '<div class="selected-event-time">', formatTime(event.time), "</div>",
            "</div>",
            "</div>",
            '<div class="selected-event-actions">',
            '<button class="btn btn-sm btn-outline-secondary event-edit-button" type="button" data-event-id="', event.id, '">Edit</button>',
            '<button class="btn btn-sm btn-outline-danger event-delete-button" type="button" data-event-id="', event.id, '">Delete</button>',
            "</div>",
            "</div>"
          ].join("");
        }).join("");
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

        eventFormHeading.textContent = "New calendar event";
        eventFormCopy.textContent = "Add an event for one person and it will appear right away.";
        saveEventButton.textContent = "Save event";
        updateEventColorPreview();
      }

      function beginEditEvent(eventData) {
        editingEventId = eventData.id;
        eventTitleInput.value = eventData.title;
        eventDateTimeInput.value = buildDateTimeValue(eventData.date, eventData.time);
        eventPersonInput.value = eventData.profileId;
        eventFormHeading.textContent = "Edit calendar event";
        eventFormCopy.textContent = "Update the details below and save your changes.";
        saveEventButton.textContent = "Update event";
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
            profileId: event.profileId
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
        var visibleEvents = getVisibleEvents();

        calendar.removeAllEvents();
        buildCalendarEvents(visibleEvents).forEach(function (event) {
          calendar.addEvent(event);
        });
        renderLegend();
        renderFilters();
        renderProfileSelect();
        renderProfileList();

        if (selectedDate) {
          renderSelectedDate(selectedDate, getEventsForDate(selectedDate));
        }
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
        events: buildCalendarEvents(getVisibleEvents()),
        eventDidMount: function (info) {
          var timeText = info.event.extendedProps.time ? formatTime(info.event.extendedProps.time) + " - " : "";
          var fullText = timeText + info.event.title + " (" + info.event.extendedProps.person + ")";

          info.el.setAttribute("title", fullText);
          info.el.style.backgroundColor = info.event.backgroundColor;
          info.el.style.borderColor = info.event.borderColor;
          info.el.style.color = "#ffffff";
        },
        dayMaxEventRows: 3,
        dateClick: function (info) {
          eventDateTimeInput.value = buildDateTimeValue(info.dateStr, "");
          renderSelectedDate(info.dateStr, getEventsForDate(info.dateStr));
        },
        eventClick: function (info) {
          var clickedDate = info.event.startStr.slice(0, 10);
          var clickedEvent = findEventById(info.event.id);

          renderSelectedDate(clickedDate, getEventsForDate(clickedDate));

          if (clickedEvent) {
            beginEditEvent(clickedEvent);
          }
        }
      });

      calendar.render();

      var initialEvents = getVisibleEvents();
      var todayString = new Date().toISOString().slice(0, 10);
      var initialDate = initialEvents.some(function (event) {
        return event.date === todayString;
      }) ? todayString : (initialEvents[0] ? initialEvents[0].date : todayString);

      renderLegend();
      renderFilters();
      renderProfileSelect();
      renderProfileList();
      renderColorPalette();
      renderIconPicker();
      renderSelectedDate(initialDate, getEventsForDate(initialDate));
      resetEventForm();
      resetProfileForm();

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

      downloadProfilesButton.addEventListener("click", function () {
        saveProfilesToBrowser();
      });

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

      eventForm.addEventListener("submit", function (submitEvent) {
        submitEvent.preventDefault();
        hideFormError(eventFormError);

        var selectedProfile = getProfileById(eventPersonInput.value);
        var selectedDateTime = eventDateTimeInput.value;
        var selectedDateObject = selectedDateTime ? new Date(selectedDateTime) : null;
        var now = new Date();
        var dateParts = splitDateTimeValue(selectedDateTime);

        if (!selectedProfile) {
          showFormError(eventFormError, "Please select a user profile.");
          return;
        }

        if (!selectedDateObject || Number.isNaN(selectedDateObject.getTime())) {
          showFormError(eventFormError, "Please enter a valid date and time.");
          return;
        }

        if (selectedDateObject < now) {
          showFormError(eventFormError, "You cannot create or update an event in the past.");
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
          icon: selectedProfile.icon || "bi-person-fill"
        };

        if (!eventData.title || !eventData.date) {
          showFormError(eventFormError, "Please complete the event title and date.");
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

      selectedDateEvents.addEventListener("click", function (clickEvent) {
        var editButton = clickEvent.target.closest(".event-edit-button");
        var deleteButton = clickEvent.target.closest(".event-delete-button");

        if (editButton) {
          var eventToEdit = findEventById(editButton.getAttribute("data-event-id"));
          if (eventToEdit) {
            beginEditEvent(eventToEdit);
          }
          return;
        }

        if (deleteButton) {
          events = events.filter(function (event) {
            return event.id !== deleteButton.getAttribute("data-event-id");
          });
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
      selectedDateTitle.textContent = "Calendar unavailable";
      selectedDateEvents.innerHTML = '<p class="text-secondary mb-0">The calendar data files could not be loaded.</p>';
    });
})();
