pipeline {
    agent any

    tools {
        jdk 'JDK-17'
        maven 'Maven-3.9'
    }

    environment {
        FRONTEND_DIR = "frontend"
        BACKEND_DIR  = "backend"
        ELECTRON_DIR = "electron"
    }

    stages {

        stage('Checkout') {
            steps {
                echo '===== Cloning Repository ====='

                git branch: 'master',
                    url: 'https://github.com/Lunatik912/NaukriAutomator.git'
            }
        }

        /* 🔹 NEW STAGE: Security Scan (Gitleaks) */
        stage('Security Scan (Gitleaks)') {
            steps {
                echo '===== Scanning Repository for Secrets ====='

                // Scans the workspace for hardcoded tokens, passwords, or keys
                bat 'gitleaks detect --source="." --verbose'
            }
        }

        /* 🔹 NEW STAGE: Test Backend */
        stage('Test Backend') {
            steps {
                echo '===== Running Backend Unit Tests ====='

                dir("${BACKEND_DIR}") {
                    bat 'mvn test'
                }
            }
        }

        stage('Build Backend') {
            steps {
                echo '===== Building Spring Boot Backend ====='

                dir("${BACKEND_DIR}") {
                    bat 'mvn clean package -DskipTests'
                    bat 'mvn dependency:copy-dependencies -DoutputDirectory=target/dependency'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo '===== Building React Frontend ====='

                dir("${FRONTEND_DIR}") {
                    bat 'npm install'
                    bat 'npm run build'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {

                    def scannerHome = tool 'SonarScanner'
                    def java21 = tool 'JDK-21'

                    withEnv([
                        "JAVA_HOME=${java21}",
                        "PATH+JAVA=${java21}\\bin"
                    ]) {

                        withSonarQubeEnv('SonarQube') {

                            withCredentials([
                                string(
                                    credentialsId: 'sonarqube-token',
                                    variable: 'SONAR_TOKEN'
                                )
                            ]) {

                                bat """
                                "${scannerHome}\\bin\\sonar-scanner.bat" ^
                                  -Dsonar.projectKey=NA_Jenkins_Demo ^
                                  -Dsonar.projectName=NA_Jenkins_Demo ^
                                  -Dsonar.sources=backend/src,frontend/src ^
                                  -Dsonar.java.binaries=backend/target/classes ^
                                  -Dsonar.java.libraries=backend/target/dependency/*.jar ^
                                  -Dsonar.token=%SONAR_TOKEN% ^
                                  -Dsonar.scanner.skipJreProvisioning=true
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo '===== Checking SonarQube Quality Gate ====='

                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        /* 🔹 NEW STAGE: Terraform Validate */
        stage('Terraform Validate') {
            steps {
                echo '===== Initializing & Validating Terraform ====='

                dir('Terraform') {

                    withCredentials([
                        string(credentialsId: 'AZURE_CLIENT_ID', variable: 'ARM_CLIENT_ID'),
                        string(credentialsId: 'AZURE_CLIENT_SECRET', variable: 'ARM_CLIENT_SECRET'),
                        string(credentialsId: 'AZURE_TENANT_ID', variable: 'ARM_TENANT_ID'),
                        string(credentialsId: 'AZURE_SUBSCRIPTION_ID', variable: 'ARM_SUBSCRIPTION_ID')
                    ]) {

                        bat '''
                        echo ===== Terraform Init =====
                        terraform init

                        echo ===== Terraform Validate =====
                        terraform validate
                        '''
                    }
                }
            }
        }

        stage('Terraform Infrastructure') {
            steps {
                echo '===== Deploying Terraform Infrastructure ====='

                dir('Terraform') {

                    withCredentials([
                        string(credentialsId: 'AZURE_CLIENT_ID', variable: 'ARM_CLIENT_ID'),
                        string(credentialsId: 'AZURE_CLIENT_SECRET', variable: 'ARM_CLIENT_SECRET'),
                        string(credentialsId: 'AZURE_TENANT_ID', variable: 'ARM_TENANT_ID'),
                        string(credentialsId: 'AZURE_SUBSCRIPTION_ID', variable: 'ARM_SUBSCRIPTION_ID')
                    ]) {

                        bat '''
                        echo ===== Terraform Plan =====
                        terraform plan

                        echo ===== Terraform Apply =====
                        terraform apply -auto-approve
                        '''
                    }
                }
            }
        }

        stage('Build Electron') {
            steps {
                echo '===== Building Electron Application ====='

                dir("${ELECTRON_DIR}") {
                    bat 'npm install'
                    bat 'npm run dist'
                }
            }
        }

        stage('Archive EXE') {
            steps {
                echo '===== Archiving Installer ====='

                archiveArtifacts artifacts: 'dist/**/*.exe',
                                 fingerprint: true
            }
        }

        stage('Upload EXE to Azure Blob') {
            steps {
                echo '===== Uploading EXE to Azure Blob Storage ====='

                withCredentials([
                    string(credentialsId: 'AZURE_CLIENT_ID', variable: 'CLIENT_ID'),
                    string(credentialsId: 'AZURE_CLIENT_SECRET', variable: 'CLIENT_SECRET'),
                    string(credentialsId: 'AZURE_TENANT_ID', variable: 'TENANT_ID'),
                    string(credentialsId: 'AZURE_SUBSCRIPTION_ID', variable: 'SUBSCRIPTION_ID')
                ]) {

                    bat '''
                    echo ===== Azure Login =====
                    az login --service-principal -u "%CLIENT_ID%" -p "%CLIENT_SECRET%" --tenant "%TENANT_ID%"
                    '''

                    bat '''
                    echo ===== Setting Azure Subscription =====
                    az account set --subscription "%SUBSCRIPTION_ID%"
                    '''

                    bat '''
                    echo ===== Checking EXE =====
                    dir "dist\\*.exe"
                    '''

                    bat '''
                    echo ===== Uploading EXE to Azure Blob =====

                    az storage blob upload ^
                      --account-name naterraformstorage01 ^
                      --container-name nacontainer ^
                      --file "dist\\NaukriAutomator 0.1.0.exe" ^
                      --name "NaukriAutomator-%BUILD_NUMBER%.exe" ^
                      --auth-mode login ^
                      --overwrite
                    '''
                }
            }
        }

        /* 🔹 NEW STAGE: Deployment Verification */
        stage('Deployment Verification') {
            steps {
                echo '===== Verifying Azure Blob Storage Artifact ====='

                withCredentials([
                    string(credentialsId: 'AZURE_CLIENT_ID', variable: 'CLIENT_ID'),
                    string(credentialsId: 'AZURE_CLIENT_SECRET', variable: 'CLIENT_SECRET'),
                    string(credentialsId: 'AZURE_TENANT_ID', variable: 'TENANT_ID'),
                    string(credentialsId: 'AZURE_SUBSCRIPTION_ID', variable: 'SUBSCRIPTION_ID')
                ]) {

                    bat '''
                    az login --service-principal -u "%CLIENT_ID%" -p "%CLIENT_SECRET%" --tenant "%TENANT_ID%" > nul
                    az account set --subscription "%SUBSCRIPTION_ID%" > nul

                    echo Checking if NaukriAutomator-%BUILD_NUMBER%.exe exists in container...
                    
                    az storage blob show ^
                      --account-name naterraformstorage01 ^
                      --container-name nacontainer ^
                      --name "NaukriAutomator-%BUILD_NUMBER%.exe" ^
                      --auth-mode login ^
                      --query "{Name:name, Size:properties.contentLength, Modified:properties.lastModified}" ^
                      --output table
                    '''
                }
            }
        }
    }

    post {

        success {
            echo '======================================='
            echo ' Build Completed Successfully'
            echo '======================================='
        }

        failure {
            echo '======================================='
            echo ' Build Failed'
            echo '======================================='
        }
    }
}
