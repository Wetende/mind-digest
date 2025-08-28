#!/usr/bin/env node

/**
 * Test Runner for Mind-Digest App
 * 
 * This script provides a comprehensive testing suite that covers:
 * - Unit tests for utilities, services, and components
 * - Integration tests for user journeys
 * - Coverage reporting
 * - Test result analysis
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };

    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async runTests() {
    this.log('🧪 Starting Mind-Digest Test Suite', 'info');
    this.log('=====================================', 'info');

    try {
      // Run unit tests
      this.log('\n📋 Running Unit Tests...', 'info');
      await this.runUnitTests();

      // Run integration tests
      this.log('\n🔗 Running Integration Tests...', 'info');
      await this.runIntegrationTests();

      // Generate coverage report
      this.log('\n📊 Generating Coverage Report...', 'info');
      await this.generateCoverageReport();

      // Display summary
      this.displaySummary();

    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async runUnitTests() {
    try {
      const unitTestPattern = '__tests__/{utils,services,components}/**/*.test.js';
      const result = execSync(`npm test -- --testPathPattern="${unitTestPattern}" --verbose`, 
        { encoding: 'utf8', stdio: 'pipe' });
      
      this.parseTestResults(result, 'unit');
      this.log('✅ Unit tests completed successfully', 'success');
    } catch (error) {
      this.log('❌ Unit tests failed', 'error');
      this.parseTestResults(error.stdout || error.message, 'unit');
    }
  }

  async runIntegrationTests() {
    try {
      const integrationTestPattern = '__tests__/integration/**/*.test.js';
      const result = execSync(`npm test -- --testPathPattern="${integrationTestPattern}" --verbose`, 
        { encoding: 'utf8', stdio: 'pipe' });
      
      this.parseTestResults(result, 'integration');
      this.log('✅ Integration tests completed successfully', 'success');
    } catch (error) {
      this.log('❌ Integration tests failed', 'error');
      this.parseTestResults(error.stdout || error.message, 'integration');
    }
  }

  async generateCoverageReport() {
    try {
      const result = execSync('npm run test:coverage', { encoding: 'utf8', stdio: 'pipe' });
      this.parseCoverageResults(result);
      this.log('✅ Coverage report generated', 'success');
    } catch (error) {
      this.log('⚠️  Coverage report generation failed', 'warning');
      console.log(error.message);
    }
  }

  parseTestResults(output, type) {
    // Parse Jest output to extract test results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const totalMatch = output.match(/(\d+) total/);

    if (passedMatch) this.testResults[type].passed = parseInt(passedMatch[1]);
    if (failedMatch) this.testResults[type].failed = parseInt(failedMatch[1]);
    if (totalMatch) this.testResults[type].total = parseInt(totalMatch[1]);
  }

  parseCoverageResults(output) {
    // Parse coverage output
    const statementsMatch = output.match(/Statements\s+:\s+([\d.]+)%/);
    const branchesMatch = output.match(/Branches\s+:\s+([\d.]+)%/);
    const functionsMatch = output.match(/Functions\s+:\s+([\d.]+)%/);
    const linesMatch = output.match(/Lines\s+:\s+([\d.]+)%/);

    if (statementsMatch) this.testResults.coverage.statements = parseFloat(statementsMatch[1]);
    if (branchesMatch) this.testResults.coverage.branches = parseFloat(branchesMatch[1]);
    if (functionsMatch) this.testResults.coverage.functions = parseFloat(functionsMatch[1]);
    if (linesMatch) this.testResults.coverage.lines = parseFloat(linesMatch[1]);
  }

  displaySummary() {
    this.log('\n📈 Test Summary', 'info');
    this.log('===============', 'info');

    // Unit tests summary
    const unitTotal = this.testResults.unit.passed + this.testResults.unit.failed;
    const unitPassRate = unitTotal > 0 ? (this.testResults.unit.passed / unitTotal * 100).toFixed(1) : 0;
    this.log(`\n🧪 Unit Tests: ${this.testResults.unit.passed}/${unitTotal} passed (${unitPassRate}%)`, 
      unitPassRate >= 90 ? 'success' : unitPassRate >= 70 ? 'warning' : 'error');

    // Integration tests summary
    const integrationTotal = this.testResults.integration.passed + this.testResults.integration.failed;
    const integrationPassRate = integrationTotal > 0 ? (this.testResults.integration.passed / integrationTotal * 100).toFixed(1) : 0;
    this.log(`🔗 Integration Tests: ${this.testResults.integration.passed}/${integrationTotal} passed (${integrationPassRate}%)`, 
      integrationPassRate >= 90 ? 'success' : integrationPassRate >= 70 ? 'warning' : 'error');

    // Coverage summary
    this.log('\n📊 Coverage Report:', 'info');
    this.log(`   Statements: ${this.testResults.coverage.statements}%`, 
      this.testResults.coverage.statements >= 80 ? 'success' : 'warning');
    this.log(`   Branches: ${this.testResults.coverage.branches}%`, 
      this.testResults.coverage.branches >= 70 ? 'success' : 'warning');
    this.log(`   Functions: ${this.testResults.coverage.functions}%`, 
      this.testResults.coverage.functions >= 80 ? 'success' : 'warning');
    this.log(`   Lines: ${this.testResults.coverage.lines}%`, 
      this.testResults.coverage.lines >= 80 ? 'success' : 'warning');

    // Overall assessment
    const overallPassRate = ((this.testResults.unit.passed + this.testResults.integration.passed) / 
      (unitTotal + integrationTotal) * 100).toFixed(1);
    
    this.log('\n🎯 Overall Assessment:', 'info');
    if (overallPassRate >= 95 && this.testResults.coverage.statements >= 80) {
      this.log('🌟 Excellent! Your code is well-tested and ready for production.', 'success');
    } else if (overallPassRate >= 85 && this.testResults.coverage.statements >= 70) {
      this.log('✅ Good test coverage. Consider adding more edge case tests.', 'success');
    } else if (overallPassRate >= 70) {
      this.log('⚠️  Moderate test coverage. More tests recommended before deployment.', 'warning');
    } else {
      this.log('❌ Low test coverage. Significant testing improvements needed.', 'error');
    }

    // Recommendations
    this.log('\n💡 Recommendations:', 'info');
    if (this.testResults.coverage.statements < 80) {
      this.log('   • Add more unit tests to increase statement coverage', 'warning');
    }
    if (this.testResults.coverage.branches < 70) {
      this.log('   • Add tests for edge cases and error conditions', 'warning');
    }
    if (integrationTotal < 5) {
      this.log('   • Consider adding more integration tests for user journeys', 'warning');
    }
    if (this.testResults.unit.failed > 0 || this.testResults.integration.failed > 0) {
      this.log('   • Fix failing tests before deployment', 'error');
    }

    this.log('\n🚀 Happy testing!', 'success');
  }

  // Generate test report file
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.testResults,
      summary: {
        totalTests: this.testResults.unit.total + this.testResults.integration.total,
        totalPassed: this.testResults.unit.passed + this.testResults.integration.passed,
        totalFailed: this.testResults.unit.failed + this.testResults.integration.failed,
        overallPassRate: ((this.testResults.unit.passed + this.testResults.integration.passed) / 
          (this.testResults.unit.total + this.testResults.integration.total) * 100).toFixed(1)
      }
    };

    fs.writeFileSync(path.join(__dirname, '..', 'test-report.json'), JSON.stringify(report, null, 2));
    this.log('\n📄 Test report saved to test-report.json', 'info');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runTests().then(() => {
    runner.generateReport();
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;