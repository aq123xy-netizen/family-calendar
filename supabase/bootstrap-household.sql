-- 1. Find your two auth user IDs in Authentication -> Users.
-- 2. Replace the placeholders below.

with new_household as (
  insert into public.households (name, created_by)
  values ('My Family Household', '00000000-0000-0000-0000-000000000001')
  returning id
)
insert into public.household_members (household_id, user_id, role)
select id, '00000000-0000-0000-0000-000000000001', 'owner' from new_household
union all
select id, '00000000-0000-0000-0000-000000000002', 'member' from new_household;

-- Optional starter profiles:
-- replace the household_id subquery if you want to target a specific household.
insert into public.profiles (household_id, name, color, icon)
select household_id, profile_name, profile_color, profile_icon
from (
  select (select id from public.households order by created_at desc limit 1) as household_id,
         'Everyone'::text as profile_name,
         '#ea4335'::text as profile_color,
         'bi-people-fill'::text as profile_icon
  union all
  select (select id from public.households order by created_at desc limit 1), 'Emma', '#4285f4', 'bi-person-heart'
  union all
  select (select id from public.households order by created_at desc limit 1), 'Noah', '#34a853', 'bi-person-standing'
) seed_profiles;
