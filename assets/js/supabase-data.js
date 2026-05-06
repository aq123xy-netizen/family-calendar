(function () {
  function normalizeError(error) {
    var message = error && error.message ? error.message : String(error || "");

    if (message.indexOf("schema cache") >= 0 || message.indexOf("Could not find the table 'public.household_members'") >= 0) {
      return new Error("Supabase tables are not set up yet. Run supabase/schema.sql in the Supabase SQL Editor, then run supabase/bootstrap-household.sql.");
    }

    if (message.indexOf("No household membership found") >= 0) {
      return new Error("This account is not connected to a household yet. Run supabase/bootstrap-household.sql with your two auth user IDs.");
    }

    return error instanceof Error ? error : new Error(message || "Unexpected Supabase error.");
  }

  function getAuth() {
    return window.familyCalendarAuth || null;
  }

  function getClient() {
    var auth = getAuth();

    if (!auth || !auth.isConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    return auth.createClient();
  }

  async function getCurrentUser() {
    var client = getClient();
    var result = await client.auth.getUser();
    var user = result.data ? result.data.user : null;

    if (!user) {
      throw new Error("You must be signed in.");
    }

    return {
      client: client,
      user: user
    };
  }

  async function getHouseholdContext() {
    try {
      var authState = await getCurrentUser();
      var membershipResult = await authState.client
        .from("household_members")
        .select("household_id, role")
        .eq("user_id", authState.user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (membershipResult.error) {
        throw membershipResult.error;
      }

      var membership = membershipResult.data && membershipResult.data[0] ? membershipResult.data[0] : null;

      if (!membership) {
        throw new Error("No household membership found for this account.");
      }

      var householdResult = await authState.client
        .from("households")
        .select("id, name, join_code")
        .eq("id", membership.household_id)
        .single();

      if (householdResult.error) {
        throw householdResult.error;
      }

      return {
        client: authState.client,
        user: authState.user,
        household: householdResult.data,
        membership: membership
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async function fetchProfiles() {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("profiles")
      .select("*")
      .eq("household_id", context.household.id)
      .order("created_at", { ascending: true });

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data || [];
  }

  async function createProfile(values) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("profiles")
      .insert({
        household_id: context.household.id,
        name: values.name,
        color: values.color,
        icon: values.icon
      })
      .select()
      .single();

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data;
  }

  async function updateProfile(profileId, values) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("profiles")
      .update({
        name: values.name,
        color: values.color,
        icon: values.icon
      })
      .eq("id", profileId)
      .eq("household_id", context.household.id)
      .select()
      .single();

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data;
  }

  async function deleteProfile(profileId) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("profiles")
      .delete()
      .eq("id", profileId)
      .eq("household_id", context.household.id);

    if (result.error) {
      throw normalizeError(result.error);
    }
  }

  async function fetchEvents() {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("events")
      .select("*")
      .eq("household_id", context.household.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data || [];
  }

  async function createEvent(values) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("events")
      .insert({
        household_id: context.household.id,
        profile_id: values.profileId,
        title: values.title,
        category: values.category,
        date: values.date,
        time: values.time || null
      })
      .select()
      .single();

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data;
  }

  async function updateEvent(eventId, values) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("events")
      .update({
        profile_id: values.profileId,
        title: values.title,
        category: values.category,
        date: values.date,
        time: values.time || null
      })
      .eq("id", eventId)
      .eq("household_id", context.household.id)
      .select()
      .single();

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data;
  }

  async function deleteEvent(eventId) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("household_id", context.household.id);

    if (result.error) {
      throw normalizeError(result.error);
    }
  }

  async function fetchMaintenanceReminders() {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("maintenance_reminders")
      .select("*")
      .eq("household_id", context.household.id)
      .order("due_date", { ascending: true });

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data || [];
  }

  async function createMaintenanceReminder(values) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("maintenance_reminders")
      .insert({
        household_id: context.household.id,
        title: values.title,
        category: values.category,
        due_date: values.dueDate,
        repeat_rule: values.repeat || null,
        reminder_notice: values.reminder || null,
        color: values.color || "#0f766e"
      })
      .select()
      .single();

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data;
  }

  async function updateMaintenanceReminder(reminderId, values) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("maintenance_reminders")
      .update({
        title: values.title,
        category: values.category,
        due_date: values.dueDate,
        repeat_rule: values.repeat || null,
        reminder_notice: values.reminder || null,
        color: values.color || "#0f766e"
      })
      .eq("id", reminderId)
      .eq("household_id", context.household.id)
      .select()
      .single();

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data;
  }

  async function deleteMaintenanceReminder(reminderId) {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("maintenance_reminders")
      .delete()
      .eq("id", reminderId)
      .eq("household_id", context.household.id);

    if (result.error) {
      throw normalizeError(result.error);
    }
  }

  async function fetchHouseholdMembers() {
    var context = await getHouseholdContext();
    var result = await context.client
      .from("household_members")
      .select("id, household_id, user_id, role, created_at")
      .eq("household_id", context.household.id)
      .order("created_at", { ascending: true });

    if (result.error) {
      throw normalizeError(result.error);
    }

    return result.data || [];
  }

  window.familyCalendarData = {
    getHouseholdContext: getHouseholdContext,
    fetchProfiles: fetchProfiles,
    createProfile: createProfile,
    updateProfile: updateProfile,
    deleteProfile: deleteProfile,
    fetchEvents: fetchEvents,
    createEvent: createEvent,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent,
    fetchMaintenanceReminders: fetchMaintenanceReminders,
    createMaintenanceReminder: createMaintenanceReminder,
    updateMaintenanceReminder: updateMaintenanceReminder,
    deleteMaintenanceReminder: deleteMaintenanceReminder,
    fetchHouseholdMembers: fetchHouseholdMembers
  };
})();
