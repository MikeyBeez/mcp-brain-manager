/**
 * Helper methods for Python Project Protocol
 * These methods complete the PythonProjectProtocol class
 */

// This file contains the remaining helper methods that should be added to PythonProjectProtocol

export const pythonProjectHelperMethods = `
  private generateChangelog(options: PythonProjectOptions): string {
    return \`# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Basic project structure
- Testing framework
- CI/CD pipeline
- Development environment configuration

## [0.1.0] - \${new Date().toISOString().split('T')[0]}

### Added
- Initial release
- Core functionality
- Documentation
- Testing suite
\`;
  }

  private generateTestCode(options: PythonProjectOptions): string {
    const packageName = options.projectName.replace(/-/g, '_');
    
    switch (options.projectType) {
      case 'cli-tool':
        return \`"""Tests for \${options.projectName}."""

import pytest
from \${packageName}.main import main
from \${packageName}.cli import main as cli_main


def test_main_function():
    """Test the main function."""
    result = main([])
    assert result == 0


def test_cli_hello():
    """Test the CLI hello command."""
    result = cli_main(["hello", "Test"])
    assert result == 0


class TestCLI:
    """Test class for CLI functionality."""
    
    def test_version_argument(self, capsys):
        """Test --version argument."""
        with pytest.raises(SystemExit):
            cli_main(["--version"])
        
        captured = capsys.readouterr()
        assert "\${options.projectName} 0.1.0" in captured.out
\`;

      case 'mcp-tool':
        return \`"""Tests for \${options.projectName} MCP server."""

import pytest
import asyncio
from \${packageName}.main import server


@pytest.mark.asyncio
async def test_list_tools():
    """Test listing tools."""
    tools = await server.list_tools()
    assert len(tools) > 0
    assert any(tool.name == "hello" for tool in tools)


@pytest.mark.asyncio
async def test_call_hello_tool():
    """Test calling the hello tool."""
    result = await server.call_tool("hello", {"message": "Test"})
    assert "Hello, Test!" in result
    assert "\${options.projectName}" in result
\`;

      case 'web-app':
      case 'api':
        return \`"""Tests for \${options.projectName} web application."""

import pytest
from \${packageName}.main import app


@pytest.fixture
def client():
    """Create a test client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_root_endpoint(client):
    """Test the root endpoint."""
    response = client.get('/')
    assert response.status_code == 200
    data = response.get_json()
    assert "message" in data
    assert "\${options.projectName}" in data["message"]
\`;

      default:
        return \`"""Tests for \${options.projectName}."""

import pytest
from \${packageName}.main import hello, main


def test_hello_default():
    """Test hello function with default argument."""
    result = hello()
    assert result == "Hello, World!"


def test_hello_custom_name():
    """Test hello function with custom name."""
    result = hello("Test")
    assert result == "Hello, Test!"


def test_main_function(capsys):
    """Test the main function."""
    main()
    captured = capsys.readouterr()
    assert "Hello, World!" in captured.out
    assert "\${options.projectName}" in captured.out
\`;
    }
  }

  private generatePytestConfig(options: PythonProjectOptions): string {
    return \`[tool:pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short --cov=src --cov-report=term-missing --cov-report=html
filterwarnings = 
    ignore::DeprecationWarning
    ignore::PendingDeprecationWarning
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
\`;
  }

  private generateInitialTasks(options: PythonProjectOptions): string[] {
    const tasks = [
      'Implement core functionality',
      'Write comprehensive tests',
      'Add error handling',
      'Create usage examples'
    ];
    
    if (options.projectType === 'mcp-tool') {
      tasks.push('Define all MCP tools', 'Test with MCP client');
    }
    
    if (options.projectType === 'cli-tool') {
      tasks.push('Add more commands', 'Improve help text');
    }
    
    if (options.projectType === 'web-app' || options.projectType === 'api') {
      tasks.push('Add more routes', 'Implement authentication', 'Add database integration');
    }

    if (options.projectType === 'data-science' || options.projectType === 'ml') {
      tasks.push('Prepare datasets', 'Implement data pipeline', 'Create visualizations');
    }
    
    return tasks;
  }

  private generateNextSteps(options: PythonProjectOptions, summary: PythonProjectSummary): string[] {
    const steps = [
      \`cd \${options.projectName}\`,
    ];

    // Add package manager specific commands
    switch (options.packageManager) {
      case 'uv':
        steps.push('uv run python -m src.' + options.projectName.replace(/-/g, '_') + '.main  # Run main');
        steps.push('uv run pytest  # Run tests');
        break;
      case 'poetry':
        steps.push('poetry run python -m src.' + options.projectName.replace(/-/g, '_') + '.main  # Run main');
        steps.push('poetry run pytest  # Run tests');
        break;
      case 'conda':
        steps.push(\`conda activate \${options.projectName}\`);
        steps.push('python -m src.' + options.projectName.replace(/-/g, '_') + '.main  # Run main');
        steps.push('pytest  # Run tests');
        break;
      default: // pip
        steps.push('source venv/bin/activate  # Activate virtual environment');
        steps.push('python -m src.' + options.projectName.replace(/-/g, '_') + '.main  # Run main');
        steps.push('pytest  # Run tests');
        break;
    }
    
    if (summary.githubRepo) {
      steps.push('git push origin main  # Push to GitHub');
    }
    
    steps.push(
      'Open in VS Code: code .',
      \`Edit src/\${options.projectName.replace(/-/g, '_')}/main.py to start coding\`,
      'Check README.md for more information'
    );
    
    return steps;
  }

  // Helper methods for README generation
  private getInstallInstructions(options: PythonProjectOptions): string {
    switch (options.packageManager) {
      case 'uv':
        return \`\\\`\\\`\\\`bash
uv add \${options.projectName}
\\\`\\\`\\\`\`;
      case 'poetry':
        return \`\\\`\\\`\\\`bash
poetry add \${options.projectName}
\\\`\\\`\\\`\`;
      case 'conda':
        return \`\\\`\\\`\\\`bash
conda install -c conda-forge \${options.projectName}
\\\`\\\`\\\`\`;
      default: // pip
        return \`\\\`\\\`\\\`bash
pip install \${options.projectName}
\\\`\\\`\\\`\`;
    }
  }

  private getUsageInstructions(options: PythonProjectOptions): string {
    const packageName = options.projectName.replace(/-/g, '_');
    
    switch (options.projectType) {
      case 'cli-tool':
        return \`\\\`\\\`\\\`bash
# Use as a command-line tool
\${options.projectName} hello World

# Or run the module directly
python -m \${packageName}.cli hello World
\\\`\\\`\\\`\`;
        
      case 'mcp-tool':
        return \`\\\`\\\`\\\`bash
# Run the MCP server
\${options.projectName}

# Or run with Python
python -m \${packageName}.server
\\\`\\\`\\\`\`;
        
      case 'web-app':
      case 'api':
        return \`\\\`\\\`\\\`python
# Run the web application
from \${packageName}.main import app

if __name__ == '__main__':
    app.run(debug=True)
\\\`\\\`\\\`

Or run directly:
\\\`\\\`\\\`bash
python -m \${packageName}.main
\\\`\\\`\\\`\`;
        
      default:
        return \`\\\`\\\`\\\`python
from \${packageName}.main import hello

print(hello("World"))
\\\`\\\`\\\`

Or run directly:
\\\`\\\`\\\`bash
python -m \${packageName}.main
\\\`\\\`\\\`\`;
    }
  }

  private getDevSetupInstructions(options: PythonProjectOptions): string {
    switch (options.packageManager) {
      case 'uv':
        return \`\\\`\\\`\\\`bash
uv venv
source .venv/bin/activate  # On Windows: .venv\\\\Scripts\\\\activate
\\\`\\\`\\\`\`;
      case 'poetry':
        return \`\\\`\\\`\\\`bash
poetry shell
\\\`\\\`\\\`\`;
      case 'conda':
        return \`\\\`\\\`\\\`bash
conda create -n \${options.projectName} python=\${options.pythonVersion || '3.11'}
conda activate \${options.projectName}
\\\`\\\`\\\`\`;
      default: // pip
        return \`\\\`\\\`\\\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\\\Scripts\\\\activate
\\\`\\\`\\\`\`;
    }
  }

  private getDevInstallInstructions(options: PythonProjectOptions): string {
    switch (options.packageManager) {
      case 'uv':
        return \`\\\`\\\`\\\`bash
uv sync --all-extras --dev
\\\`\\\`\\\`\`;
      case 'poetry':
        return \`\\\`\\\`\\\`bash
poetry install
\\\`\\\`\\\`\`;
      case 'conda':
        return \`\\\`\\\`\\\`bash
pip install -e .
pip install -r requirements-dev.txt
\\\`\\\`\\\`\`;
      default: // pip
        return \`\\\`\\\`\\\`bash
pip install -e .
pip install -r requirements-dev.txt
\\\`\\\`\\\`\`;
    }
  }

  private getTestCommand(options: PythonProjectOptions): string {
    switch (options.packageManager) {
      case 'uv':
        return 'uv run pytest';
      case 'poetry':
        return 'poetry run pytest';
      default:
        return 'pytest';
    }
  }

  private getFormatCommand(options: PythonProjectOptions): string {
    switch (options.packageManager) {
      case 'uv':
        return 'uv run black src tests && uv run isort src tests';
      case 'poetry':
        return 'poetry run black src tests && poetry run isort src tests';
      default:
        return 'black src tests && isort src tests';
    }
  }

  private getLintCommand(options: PythonProjectOptions): string {
    switch (options.packageManager) {
      case 'uv':
        return 'uv run flake8 src tests && uv run mypy src';
      case 'poetry':
        return 'poetry run flake8 src tests && poetry run mypy src';
      default:
        return 'flake8 src tests && mypy src';
    }
  }
`;
