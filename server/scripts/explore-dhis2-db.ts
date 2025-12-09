import { config as loadEnv } from "dotenv";
import { postgresService } from "../src/services/postgresService";

loadEnv();

const diseases = ["Malaria", "Lassa", "Typhoid", "Ebola", "Cholera", "Measles", "Yellow Fever"];

async function exploreDHIS2Database() {
  console.log("=".repeat(80));
  console.log("DHIS2 SIERRA LEONE DATABASE EXPLORATION");
  console.log("=".repeat(80));
  console.log();

  try {
    // Test connection
    console.log("1. Testing database connection...");
    const isHealthy = await postgresService.healthCheck();
    console.log(`   ✓ Database connection: ${isHealthy ? "SUCCESS" : "FAILED"}`);
    console.log();

    if (!isHealthy) {
      console.error("Cannot proceed without database connection. Please check your configuration.");
      return;
    }

    // Get all data elements
    console.log("2. Fetching all data elements...");
    const allDataElements = await postgresService.getDataElements();
    console.log(`   ✓ Total data elements: ${allDataElements.length}`);
    console.log();

    // Get disease-related data elements
    console.log("3. Searching for disease-related data elements...");
    const diseaseDataElements = await postgresService.getDataElements(diseases);
    console.log(`   ✓ Disease-related data elements: ${diseaseDataElements.length}`);
    console.log();

    if (diseaseDataElements.length > 0) {
      console.log("   Disease Data Elements:");
      diseaseDataElements.forEach((de, idx) => {
        console.log(`   ${idx + 1}. ${de.name} (ID: ${de.dataelementid}, UID: ${de.uid})`);
        if (de.description) {
          console.log(`      Description: ${de.description}`);
        }
        console.log(`      Type: ${de.valuetype}, Domain: ${de.domaintype}, Aggregation: ${de.aggregationtype}`);
        console.log();
      });
    }

    // Get organization units
    console.log("4. Fetching organization units (locations)...");
    const orgUnits = await postgresService.getOrganisationUnits();
    console.log(`   ✓ Total organization units: ${orgUnits.length}`);
    console.log();

    // Group by hierarchy level
    const byLevel: Record<number, any[]> = {};
    orgUnits.forEach(ou => {
      if (!byLevel[ou.hierarchylevel]) {
        byLevel[ou.hierarchylevel] = [];
      }
      byLevel[ou.hierarchylevel].push(ou);
    });

    console.log("   Organization Unit Hierarchy:");
    Object.keys(byLevel).sort().forEach(level => {
      console.log(`   Level ${level}: ${byLevel[Number(level)].length} units`);
      // Show first 5 examples
      byLevel[Number(level)].slice(0, 5).forEach(ou => {
        console.log(`      - ${ou.name} (${ou.uid})`);
      });
      if (byLevel[Number(level)].length > 5) {
        console.log(`      ... and ${byLevel[Number(level)].length - 5} more`);
      }
      console.log();
    });

    // Get indicators
    console.log("5. Fetching indicators...");
    const indicators = await postgresService.getIndicators();
    console.log(`   ✓ Total indicators: ${indicators.length}`);
    console.log();

    console.log("6. Searching for disease-related indicators...");
    const diseaseIndicators = await postgresService.getIndicators(diseases);
    console.log(`   ✓ Disease-related indicators: ${diseaseIndicators.length}`);
    console.log();

    if (diseaseIndicators.length > 0) {
      console.log("   Disease Indicators:");
      diseaseIndicators.slice(0, 10).forEach((ind, idx) => {
        console.log(`   ${idx + 1}. ${ind.name} (${ind.uid})`);
        if (ind.description) {
          console.log(`      Description: ${ind.description}`);
        }
        console.log();
      });
      if (diseaseIndicators.length > 10) {
        console.log(`   ... and ${diseaseIndicators.length - 10} more indicators`);
        console.log();
      }
    }

    // Get programs
    console.log("7. Fetching programs...");
    const programs = await postgresService.getPrograms();
    console.log(`   ✓ Total programs: ${programs.length}`);
    console.log();

    if (programs.length > 0) {
      console.log("   Programs:");
      programs.forEach((prog, idx) => {
        console.log(`   ${idx + 1}. ${prog.name} (${prog.uid})`);
        console.log(`      Type: ${prog.programtype}`);
        if (prog.description) {
          console.log(`      Description: ${prog.description}`);
        }
        console.log();
      });
    }

    // Get sample data values
    console.log("8. Fetching sample data values...");
    if (diseaseDataElements.length > 0) {
      const sampleDataElementIds = diseaseDataElements.slice(0, 5).map(de => de.dataelementid);
      const sampleData = await postgresService.getDataValues({
        dataElementIds: sampleDataElementIds,
        limit: 20
      });
      console.log(`   ✓ Sample data values: ${sampleData.length}`);
      console.log();

      if (sampleData.length > 0) {
        console.log("   Sample Data:");
        sampleData.forEach((dv, idx) => {
          console.log(`   ${idx + 1}. ${dv.dataelementname} @ ${dv.orgunitname}`);
          console.log(`      Period: ${dv.startdate} to ${dv.enddate}`);
          console.log(`      Value: ${dv.value}`);
          console.log();
        });
      }

      // Get disease statistics
      console.log("9. Calculating disease statistics...");
      const diseaseStats = await postgresService.getDiseaseStats(
        diseaseDataElements.map(de => de.dataelementid)
      );
      console.log(`   ✓ Disease statistics calculated`);
      console.log();

      if (diseaseStats.length > 0) {
        console.log("   Disease Statistics:");
        diseaseStats.forEach((stat, idx) => {
          console.log(`   ${idx + 1}. ${stat.disease}`);
          console.log(`      Total Cases: ${stat.total_cases || 0}`);
          console.log(`      Average Cases: ${stat.avg_cases ? parseFloat(stat.avg_cases).toFixed(2) : 0}`);
          console.log(`      Max Cases: ${stat.max_cases || 0}`);
          console.log(`      Data Range: ${stat.earliest_date} to ${stat.latest_date}`);
          console.log(`      Total Periods: ${stat.total_periods}`);
          console.log();
        });
      }
    }

    console.log("=".repeat(80));
    console.log("EXPLORATION COMPLETE");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("Error exploring database:", error);
  } finally {
    await postgresService.close();
  }
}

exploreDHIS2Database();
