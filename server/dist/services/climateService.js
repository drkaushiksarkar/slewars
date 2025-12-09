import { postgresService } from './postgresService';
import logger from './logger';
class ClimateService {
    constructor() {
        this.era5Config = {
            apiKey: process.env.ERA5_API_KEY || '',
            apiUrl: process.env.ERA5_API_URL || 'https://cds.climate.copernicus.eu/api/v2',
            sierraLeoneArea: [10, -13.5, 7.5, -10.5] // North, West, South, East
        };
    }
    /**
     * Get climate data for a location and date range
     * Checks cache first, fetches from ERA5 if missing
     */
    async getClimateData(locationUid, startDate, endDate) {
        try {
            logger.info(`Fetching climate data for ${locationUid} from ${startDate} to ${endDate}`);
            // First, check if we have cached data
            const cachedData = await this.getCachedData(locationUid, startDate, endDate);
            // Calculate missing dates
            const missingDates = this.findMissingDates(cachedData, startDate, endDate);
            // If we have missing dates and ERA5 is configured, fetch from ERA5
            if (missingDates.length > 0 && this.era5Config.apiKey) {
                logger.info(`Found ${missingDates.length} missing dates, fetching from ERA5...`);
                const era5Data = await this.fetchFromERA5(locationUid, missingDates);
                // Store the fetched data in cache
                if (era5Data.length > 0) {
                    await this.storeCachedData(era5Data);
                    cachedData.push(...era5Data);
                }
            }
            else if (missingDates.length > 0) {
                logger.warn(`Missing ${missingDates.length} dates but ERA5 API key not configured. Using synthetic data.`);
                // Generate synthetic data for missing dates (for development/testing)
                const syntheticData = await this.generateSyntheticData(locationUid, missingDates);
                await this.storeCachedData(syntheticData);
                cachedData.push(...syntheticData);
            }
            // Sort by date
            return cachedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        catch (error) {
            logger.error({ error }, 'Error in getClimateData');
            throw error;
        }
    }
    /**
     * Get cached climate data from PostgreSQL
     */
    async getCachedData(locationUid, startDate, endDate) {
        try {
            const query = `
        SELECT
          location_uid,
          date::text,
          temperature_mean,
          temperature_min,
          temperature_max,
          precipitation,
          humidity,
          wind_speed,
          source
        FROM climate_data
        WHERE location_uid = $1
          AND date >= $2::date
          AND date <= $3::date
        ORDER BY date
      `;
            const result = await postgresService.query(query, [locationUid, startDate, endDate]);
            logger.info(`Found ${result.rows.length} cached climate records`);
            return result.rows;
        }
        catch (error) {
            logger.error({ error }, 'Error fetching cached climate data');
            return [];
        }
    }
    /**
     * Find missing dates in cached data
     */
    findMissingDates(cachedData, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const cachedDates = new Set(cachedData.map(d => d.date));
        const missingDates = [];
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            if (!cachedDates.has(dateStr)) {
                missingDates.push(dateStr);
            }
        }
        return missingDates;
    }
    /**
     * Fetch climate data from ERA5 CDS API
     * Note: This is a simplified implementation.
     * Real ERA5 API requires asynchronous job submission and NetCDF parsing
     */
    async fetchFromERA5(locationUid, dates) {
        try {
            logger.info(`Fetching ${dates.length} dates from ERA5 API...`);
            // Get location coordinates from DHIS2
            const coords = await this.getLocationCoordinates(locationUid);
            if (!coords) {
                logger.warn(`No coordinates found for location ${locationUid}`);
                return [];
            }
            // In a real implementation, this would:
            // 1. Submit a request to ERA5 CDS API
            // 2. Wait for job to complete
            // 3. Download NetCDF file
            // 4. Parse NetCDF data
            // 5. Extract values for specific location
            // For now, we'll use a mock/placeholder
            logger.warn('ERA5 API integration not fully implemented, using synthetic data');
            return this.generateSyntheticData(locationUid, dates);
        }
        catch (error) {
            logger.error({ error }, 'Error fetching from ERA5');
            return [];
        }
    }
    /**
     * Get location coordinates from DHIS2 organisationunit
     */
    async getLocationCoordinates(locationUid) {
        try {
            const query = `
        SELECT
          ST_Y(ST_Centroid(geometry)) as lat,
          ST_X(ST_Centroid(geometry)) as lon
        FROM organisationunit
        WHERE uid = $1
          AND geometry IS NOT NULL
      `;
            const result = await postgresService.query(query, [locationUid]);
            if (result.rows.length > 0) {
                return {
                    lat: parseFloat(result.rows[0].lat),
                    lon: parseFloat(result.rows[0].lon)
                };
            }
            return null;
        }
        catch (error) {
            logger.error({ error }, 'Error fetching location coordinates');
            return null;
        }
    }
    /**
     * Generate synthetic climate data for development/testing
     * Sierra Leone climate characteristics:
     * - Rainy season: May-October (high precipitation, humidity)
     * - Dry season: November-April (low precipitation, lower humidity)
     * - Temperature: 24-32°C year-round, relatively stable
     */
    async generateSyntheticData(locationUid, dates) {
        logger.info(`Generating synthetic climate data for ${dates.length} dates`);
        return dates.map(dateStr => {
            const date = new Date(dateStr);
            const month = date.getMonth() + 1; // 1-12
            // Determine if it's rainy season (May-October)
            const isRainySeason = month >= 5 && month <= 10;
            // Temperature (varies slightly by season and random variation)
            const baseTempMean = isRainySeason ? 26 : 28;
            const tempVariation = (Math.random() - 0.5) * 4; // ±2°C
            const temperature_mean = parseFloat((baseTempMean + tempVariation).toFixed(2));
            const temperature_min = parseFloat((temperature_mean - 3 - Math.random() * 2).toFixed(2));
            const temperature_max = parseFloat((temperature_mean + 3 + Math.random() * 2).toFixed(2));
            // Precipitation (much higher in rainy season)
            const basePrecip = isRainySeason ? 15 : 2;
            const precipVariation = Math.random() * (isRainySeason ? 20 : 5);
            const precipitation = parseFloat((basePrecip + precipVariation).toFixed(2));
            // Humidity (higher in rainy season)
            const baseHumidity = isRainySeason ? 85 : 65;
            const humidityVariation = (Math.random() - 0.5) * 10;
            const humidity = parseFloat((baseHumidity + humidityVariation).toFixed(2));
            // Wind speed (relatively consistent, slight increase in dry season)
            const baseWind = isRainySeason ? 2.5 : 3.5;
            const windVariation = (Math.random() - 0.5) * 1.5;
            const wind_speed = parseFloat((baseWind + windVariation).toFixed(2));
            return {
                location_uid: locationUid,
                date: dateStr,
                temperature_mean,
                temperature_min,
                temperature_max,
                precipitation,
                humidity,
                wind_speed,
                source: 'synthetic'
            };
        });
    }
    /**
     * Store climate data in PostgreSQL cache
     */
    async storeCachedData(data) {
        if (data.length === 0)
            return;
        try {
            logger.info(`Storing ${data.length} climate records in cache`);
            // Build bulk insert query with ON CONFLICT update
            const values = data.map((d, index) => {
                const offset = index * 9;
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
            }).join(',');
            const params = data.flatMap(d => [
                d.location_uid,
                d.date,
                d.temperature_mean || null,
                d.temperature_min || null,
                d.temperature_max || null,
                d.precipitation || null,
                d.humidity || null,
                d.wind_speed || null,
                d.source || 'ERA5'
            ]);
            const query = `
        INSERT INTO climate_data (
          location_uid, date, temperature_mean, temperature_min,
          temperature_max, precipitation, humidity, wind_speed, source
        )
        VALUES ${values}
        ON CONFLICT (location_uid, date, source)
        DO UPDATE SET
          temperature_mean = EXCLUDED.temperature_mean,
          temperature_min = EXCLUDED.temperature_min,
          temperature_max = EXCLUDED.temperature_max,
          precipitation = EXCLUDED.precipitation,
          humidity = EXCLUDED.humidity,
          wind_speed = EXCLUDED.wind_speed,
          updated_at = NOW()
      `;
            await postgresService.query(query, params);
            logger.info(`Successfully stored ${data.length} climate records`);
        }
        catch (error) {
            logger.error({ error }, 'Error storing climate data');
            throw error;
        }
    }
    /**
     * Get aggregated climate data by week or month
     */
    async getAggregatedClimateData(locationUid, startDate, endDate, aggregation = 'week') {
        try {
            // First ensure we have the data cached
            await this.getClimateData(locationUid, startDate, endDate);
            // Now aggregate it
            const dateGrouping = aggregation === 'week'
                ? "DATE_TRUNC('week', date)"
                : "DATE_TRUNC('month', date)";
            const query = `
        SELECT
          ${dateGrouping}::date as period,
          location_uid,
          AVG(temperature_mean) as avg_temperature,
          MIN(temperature_min) as min_temperature,
          MAX(temperature_max) as max_temperature,
          SUM(precipitation) as total_precipitation,
          AVG(humidity) as avg_humidity,
          AVG(wind_speed) as avg_wind_speed,
          COUNT(*) as days_count
        FROM climate_data
        WHERE location_uid = $1
          AND date >= $2::date
          AND date <= $3::date
        GROUP BY period, location_uid
        ORDER BY period
      `;
            const result = await postgresService.query(query, [locationUid, startDate, endDate]);
            return result.rows.map((row) => ({
                ...row,
                period: row.period,
                avg_temperature: parseFloat(row.avg_temperature),
                min_temperature: parseFloat(row.min_temperature),
                max_temperature: parseFloat(row.max_temperature),
                total_precipitation: parseFloat(row.total_precipitation),
                avg_humidity: parseFloat(row.avg_humidity),
                avg_wind_speed: parseFloat(row.avg_wind_speed),
                days_count: parseInt(row.days_count)
            }));
        }
        catch (error) {
            logger.error({ error }, 'Error getting aggregated climate data');
            throw error;
        }
    }
    /**
     * Get climate statistics for a location
     */
    async getClimateStatistics(locationUid) {
        try {
            const query = `
        SELECT
          location_uid,
          COUNT(*) as total_records,
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          AVG(temperature_mean) as avg_temperature,
          MIN(temperature_min) as min_temperature_ever,
          MAX(temperature_max) as max_temperature_ever,
          AVG(precipitation) as avg_daily_precipitation,
          SUM(precipitation) as total_precipitation,
          AVG(humidity) as avg_humidity,
          AVG(wind_speed) as avg_wind_speed
        FROM climate_data
        WHERE location_uid = $1
        GROUP BY location_uid
      `;
            const result = await postgresService.query(query, [locationUid]);
            if (result.rows.length === 0) {
                return null;
            }
            const stats = result.rows[0];
            return {
                location_uid: stats.location_uid,
                total_records: parseInt(stats.total_records),
                earliest_date: stats.earliest_date,
                latest_date: stats.latest_date,
                avg_temperature: parseFloat(stats.avg_temperature),
                min_temperature_ever: parseFloat(stats.min_temperature_ever),
                max_temperature_ever: parseFloat(stats.max_temperature_ever),
                avg_daily_precipitation: parseFloat(stats.avg_daily_precipitation),
                total_precipitation: parseFloat(stats.total_precipitation),
                avg_humidity: parseFloat(stats.avg_humidity),
                avg_wind_speed: parseFloat(stats.avg_wind_speed)
            };
        }
        catch (error) {
            logger.error({ error }, 'Error getting climate statistics');
            throw error;
        }
    }
    /**
     * Sync climate data for all districts in Sierra Leone
     * This can be run as a cron job to keep data up to date
     */
    async syncAllDistricts(startDate, endDate) {
        try {
            logger.info(`Starting climate data sync for all districts from ${startDate} to ${endDate}`);
            // Get all level 2 organization units (districts)
            const query = `
        SELECT uid, name
        FROM organisationunit
        WHERE hierarchylevel = 2
        ORDER BY name
      `;
            const result = await postgresService.query(query);
            const districts = result.rows;
            logger.info(`Found ${districts.length} districts to sync`);
            let successCount = 0;
            let errorCount = 0;
            for (const district of districts) {
                try {
                    logger.info(`Syncing climate data for ${district.name} (${district.uid})`);
                    await this.getClimateData(district.uid, startDate, endDate);
                    successCount++;
                }
                catch (error) {
                    logger.error({ error, district: district.name }, `Error syncing ${district.name}`);
                    errorCount++;
                }
            }
            logger.info(`Climate sync complete: ${successCount} succeeded, ${errorCount} failed`);
        }
        catch (error) {
            logger.error({ error }, 'Error in syncAllDistricts');
            throw error;
        }
    }
}
export default new ClimateService();
