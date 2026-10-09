import streamlit as st
import pandas as pd
import requests
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# --- 1. Page Configuration ---
st.set_page_config(page_title="Pro F1 Analytics Hub", layout="wide", initial_sidebar_state="expanded")

BASE_URL = "https://api.openf1.org/v1"

# --- 2. Cached API Engine ---
@st.cache_data(ttl=3600)
def fetch_api(endpoint, params=None):
    """Safely queries OpenF1 API which provides telemetry and session data."""
    try:
        response = requests.get(f"{BASE_URL}/{endpoint}", params=params, timeout=15)
        if response.status_code != 200:
            return pd.DataFrame()
        data = response.json()
        if isinstance(data, dict) and ('error' in data or 'detail' in data):
            return pd.DataFrame()
        return pd.DataFrame(data)
    except Exception:
        return pd.DataFrame()

# --- 3. Sidebar: Configuration ---
st.sidebar.title("Data Selection")

# Historical data from 2023 onwards is free and accessible.
selected_year = st.sidebar.selectbox("Season Year", [2024, 2023, 2025, 2026], index=0, key="sb_year")

with st.spinner("Loading calendar..."):
    sessions_df = fetch_api("sessions", {"year": selected_year})

if sessions_df.empty:
    st.error(f"No calendar data returned for {selected_year}.")
    st.stop()

if 'meeting_name' not in sessions_df.columns:
    sessions_df['meeting_name'] = sessions_df.get('circuit_short_name', 'Event ' + sessions_df['meeting_key'].astype(str))
if 'country_name' not in sessions_df.columns:
    sessions_df['country_name'] = "Unknown"

meetings = sessions_df[['meeting_key', 'meeting_name', 'country_name']].drop_duplicates()
selected_meeting = st.sidebar.selectbox("Grand Prix", meetings['meeting_name'].tolist(), key="sb_meeting")

meeting_sessions = sessions_df[sessions_df['meeting_name'] == selected_meeting]
selected_session = st.sidebar.selectbox("Session Type", meeting_sessions['session_name'].tolist(), key="sb_session")

session_info = meeting_sessions[meeting_sessions['session_name'] == selected_session].iloc[0]
session_key = session_info['session_key']

st.sidebar.markdown("---")
st.sidebar.header("Driver Focus")
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

# Driver Profile UI
headshot = driver_data.get('headshot_url')
if pd.notna(headshot) and headshot:
    st.sidebar.image(headshot, width=150)

st.sidebar.markdown(f"""
**{driver_data.get('full_name', selected_driver)}** (#{d_num})  
*Team:* {driver_data.get('team_name', 'Unknown')}  
*Country:* {driver_data.get('country_code', 'UNK')}
""")

# --- 4. Main Dashboard Header ---
st.title(f"🏁 {session_info.get('meeting_name', 'Grand Prix')}")
st.markdown(f"**Circuit:** {session_info.get('circuit_short_name', 'Track')} | **Location:** {session_info.get('country_name', 'Unknown')} | **Session:** {session_info.get('session_name', 'Session')}")
st.markdown("---")

# --- 5. Application Tabs ---
tab1, tab2, tab3 = st.tabs(["🏎️ Telemetry Studio", "📊 Tyre Strategy", "🌦️ Track Conditions"])

with tab1:
    st.subheader("Fastest Lap Analysis")
    with st.spinner("Analyzing laps..."):
        laps_df = fetch_api("laps", {"session_key": session_key, "driver_number": d_num})
    
    if laps_df.empty or 'lap_duration' not in laps_df.columns:
        st.warning("No lap times recorded for this driver.")
    else:
        valid_laps = laps_df.dropna(subset=['lap_duration'])
        if valid_laps.empty:
            st.warning("No complete valid laps logged.")
        else:
            fastest_lap = valid_laps.loc[valid_laps['lap_duration'].idxmin()]
            
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Lap Time", f"{fastest_lap['lap_duration']:.3f} s")
            c2.metric("Lap Number", int(fastest_lap['lap_number']))
            c3.metric("Sector 1", f"{fastest_lap.get('duration_sector_1', 'N/A')} s")
            # st_speed is the speed at the specific point on the track where the highest speeds are usually recorded.
            c4.metric("Top Speed Trap", f"{fastest_lap.get('st_speed', 'N/A')} km/h") 
            
            start_dt = pd.to_datetime(fastest_lap['date_start'])
            end_dt = start_dt + pd.Timedelta(seconds=float(fastest_lap['lap_duration']))
            start_str = start_dt.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
            end_str = end_dt.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
            
            with st.spinner("Extracting telemetry..."):
                telemetry_df = fetch_api("car_data", {"session_key": session_key, "driver_number": d_num, "date>=": start_str, "date<=": end_str})
                location_df = fetch_api("location", {"session_key": session_key, "driver_number": d_num, "date>=": start_str, "date<=": end_str})
            
            col_charts, col_map = st.columns([2, 1])
            
            with col_charts:
                st.markdown("**Pedal Inputs, Speed & RPM**")
                if not telemetry_df.empty and 'speed' in telemetry_df.columns:
                    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, vertical_spacing=0.05, row_heights=[0.5, 0.25, 0.25])
                    fig.add_trace(go.Scatter(x=telemetry_df['date'], y=telemetry_df['speed'], name="Speed (km/h)", line=dict(color="#00E5FF", width=2)), row=1, col=1)
                    if 'throttle' in telemetry_df.columns:
                        fig.add_trace(go.Scatter(x=telemetry_df['date'], y=telemetry_df['throttle'], name="Throttle %", line=dict(color="#00E676", width=2)), row=2, col=1)
                    if 'brake' in telemetry_df.columns:
                        fig.add_trace(go.Scatter(x=telemetry_df['date'], y=telemetry_df['brake'], name="Brake %", line=dict(color="#FF1744", width=2)), row=2, col=1)
                    if 'rpm' in telemetry_df.columns:
                        fig.add_trace(go.Scatter(x=telemetry_df['date'], y=telemetry_df['rpm'], name="RPM", line=dict(color="#FFEA00", width=2)), row=3, col=1)
                    
                    fig.update_layout(height=600, margin=dict(l=0, r=0, t=10, b=0), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", showlegend=False)
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("High-frequency telemetry (car_data) is blocked or missing for this specific session.")
            
            with col_map:
                st.markdown("**Track Position Trace**")
                if not location_df.empty and 'x' in location_df.columns and 'y' in location_df.columns:
                    fig_map = go.Figure(go.Scatter(x=location_df['x'], y=location_df['y'], mode='lines', line=dict(color=d_color, width=4)))
                    fig_map.update_layout(xaxis=dict(visible=False), yaxis=dict(visible=False, scaleanchor="x", scaleratio=1), margin=dict(l=0, r=0, t=10, b=0), height=500, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                    st.plotly_chart(fig_map, use_container_width=True)
                else:
                    st.info("Positional coordinates (location) are missing for this session.")

with tab2:
    st.subheader("Tyre Strategy & Pit Stops")
    with st.spinner("Fetching stints..."):
        stints_df = fetch_api("stints", {"session_key": session_key, "driver_number": d_num})
    
    if not stints_df.empty and 'compound' in stints_df.columns:
        st.markdown("**Stint Breakdown**")
        stints_df['lap_start'] = stints_df['lap_start'].fillna(1)
        stints_df['lap_end'] = stints_df['lap_end'].fillna(stints_df['lap_start'] + 1)
        stints_df['stint_length'] = stints_df['lap_end'] - stints_df['lap_start']
        
        # Standard Formula 1 Tyre Colors
        color_map = {"SOFT": "#FF1744", "MEDIUM": "#FFEA00", "HARD": "#FFFFFF", "INTERMEDIATE": "#00E676", "WET": "#2979FF", "UNKNOWN": "#888888"}
        stints_df['color'] = stints_df['compound'].apply(lambda x: color_map.get(str(x).upper(), "#888888"))
        
        fig_stints = go.Figure()
        for idx, row in stints_df.iterrows():
            fig_stints.add_trace(go.Bar(
                y=[selected_driver],
                x=[row['stint_length']],
                base=row['lap_start'],
                name=row['compound'],
                orientation='h',
                marker=dict(color=row['color'], line=dict(color='black', width=1)),
                text=f"{row['compound']} ({row.get('tyre_age_at_start', 0)} laps old)",
                hoverinfo="text"
            ))
        
        fig_stints.update_layout(barmode='stack', height=250, xaxis_title="Lap Number", yaxis_visible=False, margin=dict(l=0, r=0, t=10, b=0), showlegend=False, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig_stints, use_container_width=True)
        
        st.markdown("**Raw Stint Log**")
        st.dataframe(stints_df[['stint_number', 'compound', 'tyre_age_at_start', 'lap_start', 'lap_end']], use_container_width=True)
    else:
        st.info("No tyre stint data available for this session.")

with tab3:
    st.subheader("Session Weather Data")
    with st.spinner("Fetching weather conditions..."):
        weather_df = fetch_api("weather", {"session_key": session_key})
    
    if not weather_df.empty and 'air_temperature' in weather_df.columns:
        fig_w = make_subplots(specs=[[{"secondary_y": True}]])
        fig_w.add_trace(go.Scatter(x=weather_df['date'], y=weather_df['air_temperature'], name="Air Temp (°C)", line=dict(color="#2979FF", width=2)), secondary_y=False)
        fig_w.add_trace(go.Scatter(x=weather_df['date'], y=weather_df['track_temperature'], name="Track Temp (°C)", line=dict(color="#FF8F00", width=2)), secondary_y=False)
        fig_w.add_trace(go.Scatter(x=weather_df['date'], y=weather_df['humidity'], name="Humidity (%)", line=dict(color="#888888", dash="dot")), secondary_y=True)
        
        fig_w.update_layout(height=450, margin=dict(l=0, r=0, t=10, b=0), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1))
        fig_w.update_xaxes(showgrid=False)
        fig_w.update_yaxes(title_text="Temperature (°C)", secondary_y=False, gridcolor="#333333")
        fig_w.update_yaxes(title_text="Humidity (%)", secondary_y=True, showgrid=False)
        
        st.plotly_chart(fig_w, use_container_width=True)
    else:
        st.info("Weather data unavailable for this session.")