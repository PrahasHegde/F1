import streamlit as st
import pandas as pd
import requests
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# --- 1. Page Configuration ---
st.set_page_config(page_title="F1 Data & Telemetry Hub", layout="wide", initial_sidebar_state="expanded")

BASE_URL = "https://api.openf1.org/v1"

# --- 2. Cached API Query Wrapper ---
@st.cache_data(ttl=3600)
def fetch_api(endpoint, params=None):
    """Safely queries OpenF1 and returns clean DataFrames."""
    try:
        response = requests.get(f"{BASE_URL}/{endpoint}", params=params, timeout=12)
        if response.status_code != 200:
            return pd.DataFrame()
        data = response.json()
        if isinstance(data, dict) and ('error' in data or 'detail' in data):
            return pd.DataFrame()
        return pd.DataFrame(data)
    except Exception:
        return pd.DataFrame()

# --- 3. Sidebar Selection Controls ---
st.sidebar.header("1. Calendar & Event")
selected_year = st.sidebar.selectbox("Season Year", [2024, 2023], index=0, key="sb_year")

with st.spinner("Loading race calendar..."):
    sessions_df = fetch_api("sessions", {"year": selected_year})

if sessions_df.empty:
    st.error(f"No calendar data returned for {selected_year}.")
    st.stop()

# Ensure required columns exist
if 'meeting_name' not in sessions_df.columns:
    sessions_df['meeting_name'] = sessions_df.get('circuit_short_name', 'Event ' + sessions_df['meeting_key'].astype(str))
if 'country_name' not in sessions_df.columns:
    sessions_df['country_name'] = "Unknown"

# Deduplicate Grand Prix events
meetings = sessions_df[['meeting_key', 'meeting_name', 'country_name']].drop_duplicates()
selected_meeting = st.sidebar.selectbox("Grand Prix", meetings['meeting_name'].tolist(), key="sb_meeting")

# Filter sessions for selected meeting
meeting_sessions = sessions_df[sessions_df['meeting_name'] == selected_meeting]
selected_session = st.sidebar.selectbox("Session Type", meeting_sessions['session_name'].tolist(), key="sb_session")

session_info = meeting_sessions[meeting_sessions['session_name'] == selected_session].iloc[0]
session_key = session_info['session_key']

st.sidebar.header("2. Driver Selection")
with st.spinner("Fetching drivers..."):
    drivers_df = fetch_api("drivers", {"session_key": session_key})

if drivers_df.empty:
    st.sidebar.warning("No drivers logged for this session.")
    st.stop()

name_col = 'broadcast_name' if 'broadcast_name' in drivers_df.columns else 'full_name'
driver_list = drivers_df[name_col].dropna().unique().tolist()
selected_driver = st.sidebar.selectbox("Driver", driver_list, key="sb_driver")

driver_data = drivers_df[drivers_df[name_col] == selected_driver].iloc[0]
d_num = driver_data['driver_number']
d_color = f"#{driver_data.get('team_colour', 'FFFFFF')}"

# Render Driver Profile in Sidebar
st.sidebar.markdown("---")
st.sidebar.markdown(f"<h3 style='color: {d_color}; margin: 0;'>{driver_data.get('team_name', 'Team')}</h3>", unsafe_allow_html=True)

headshot = driver_data.get('headshot_url')
if pd.notna(headshot) and headshot:
    st.sidebar.image(headshot, width=180)

st.sidebar.markdown(f"""
- **Driver:** {driver_data.get('full_name', selected_driver)}
- **Number:** #{d_num}
- **Country:** {driver_data.get('country_code', 'UNK')}
""")

# --- 4. Main Panel: Circuit & Event Header ---
st.title(f"🏁 {session_info.get('meeting_name', 'Grand Prix')}")
st.markdown(f"""
**📍 Circuit:** {session_info.get('circuit_short_name', 'Track')} &nbsp;|&nbsp; 
**🌍 Country:** {session_info.get('country_name', 'Unknown')} &nbsp;|&nbsp; 
**⏱️ Session:** {session_info.get('session_name', 'Session')} ({selected_year})
""")
st.markdown("---")

# --- 5. Lap Analysis: Locate Fastest Lap ---
st.subheader("⏱️ Fastest Lap Telemetry Analysis")

with st.spinner("Fetching lap records..."):
    laps_df = fetch_api("laps", {"session_key": session_key, "driver_number": d_num})

if laps_df.empty or 'lap_duration' not in laps_df.columns:
    st.warning("No lap time records available for this driver in this session.")
    st.stop()

valid_laps = laps_df.dropna(subset=['lap_duration'])
if valid_laps.empty:
    st.warning("No valid timed laps logged for this driver.")
    st.stop()

fastest_lap = valid_laps.loc[valid_laps['lap_duration'].idxmin()]

c1, c2, c3, c4 = st.columns(4)
c1.metric("Lap Time", f"{fastest_lap['lap_duration']:.3f} s")
c2.metric("Lap Number", int(fastest_lap['lap_number']))
c3.metric("Sector 1", f"{fastest_lap.get('duration_sector_1', 'N/A')} s")
c4.metric("Trap Speed (I2)", f"{fastest_lap.get('i2_speed', 'N/A')} km/h")

# --- 6. Time Window Slice for Telemetry ---
start_dt = pd.to_datetime(fastest_lap['date_start'])
end_dt = start_dt + pd.Timedelta(seconds=float(fastest_lap['lap_duration']))

start_str = start_dt.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
end_str = end_dt.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]

with st.spinner("Extracting synchronized telemetry & coordinate traces..."):
    telemetry_df = fetch_api("car_data", {
        "session_key": session_key,
        "driver_number": d_num,
        "date>=": start_str,
        "date<=": end_str
    })
    location_df = fetch_api("location", {
        "session_key": session_key,
        "driver_number": d_num,
        "date>=": start_str,
        "date<=": end_str
    })

# --- 7. Dual Display: Graphs & Circuit Trace ---
col_charts, col_map = st.columns([2, 1])

with col_charts:
    st.markdown("**Throttle, Brake, and Speed Curves**")
    if not telemetry_df.empty and 'speed' in telemetry_df.columns:
        fig = make_subplots(
            rows=2, cols=1,
            shared_xaxes=True,
            vertical_spacing=0.1,
            subplot_titles=("Velocity (km/h)", "Pedal Inputs (%)")
        )
        
        # Velocity Trace
        fig.add_trace(
            go.Scatter(x=telemetry_df['date'], y=telemetry_df['speed'], name="Speed", line=dict(color="#00E5FF", width=2.5)),
            row=1, col=1
        )
        
        # Throttle Trace
        if 'throttle' in telemetry_df.columns:
            fig.add_trace(
                go.Scatter(x=telemetry_df['date'], y=telemetry_df['throttle'], name="Throttle", line=dict(color="#00E676", width=2)),
                row=2, col=1
            )
        # Brake Trace
        if 'brake' in telemetry_df.columns:
            fig.add_trace(
                go.Scatter(x=telemetry_df['date'], y=telemetry_df['brake'], name="Brake", line=dict(color="#FF1744", width=2)),
                row=2, col=1
            )

        fig.update_layout(
            height=480,
            margin=dict(l=0, r=0, t=30, b=0),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)"
        )
        fig.update_xaxes(showgrid=False, showticklabels=False)
        fig.update_yaxes(gridcolor="#333333")
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("High-frequency car telemetry is not indexed for this lap.")

with col_map:
    st.markdown("**Fastest Lap Track Trajectory**")
    if not location_df.empty and 'x' in location_df.columns and 'y' in location_df.columns:
        fig_map = go.Figure()
        fig_map.add_trace(go.Scatter(
            x=location_df['x'], y=location_df['y'],
            mode='lines',
            line=dict(color=d_color, width=3.5),
            name="Apex Trace"
        ))
        fig_map.update_layout(
            xaxis=dict(visible=False),
            yaxis=dict(visible=False, scaleanchor="x", scaleratio=1),
            margin=dict(l=0, r=0, t=30, b=0),
            height=480,
            showlegend=False,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)"
        )
        st.plotly_chart(fig_map, use_container_width=True)
    else:
        st.info("Track positional coordinate set missing for this lap.")