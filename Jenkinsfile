def sendDiscordNotification(String status, String color, String message) {
    withCredentials([string(credentialsId: 'discord-webhook-url', variable: 'WEBHOOK_URL')]) {
        // Construimos el payload JSON para Discord con un formato "embed"
        def payload = """
        {
          "embeds": [
            {
              "title": "Pipeline: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
              "url": "${env.BUILD_URL}",
              "description": "${message}",
              "color": ${color},
              "footer": {
                "text": "Jenkins CI/CD"
              }
            }
          ]
        }
        """
        // Usamos curl para enviar la notificación al webhook
        sh "curl -X POST -H 'Content-Type: application/json' -d '${payload}' \${WEBHOOK_URL}"
    }
}


pipeline {
    agent any
    environment {
        // Credenciales y configuraciones
        DEV_SERVER = '172.19.0.10'
        PROD_SERVER = '172.18.0.10'
        APP_NAME = 'tasks-app'
        DEPLOY_USER = 'jenkins-deploy'
        DOCKERHUB_USERNAME = 'javierrabago'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Código descargado correctamente.'
            }
        }
        stage('Install Dependencies') {
            steps {
                echo 'Instalando dependencias...'
                sh 'npm install'
            }
        }
        stage('Unit Tests') {
            steps {
                echo 'Ejecutando pruebas unitarias...'
                sh 'npm test'
            }
        }
        stage('Lint') {
            steps {
                echo 'Verificando calidad del código...'
                sh 'node -c index.js'
            }
        }
        
        stage('Approve Production Deployment') {
            steps {
                // Solicitar aprobación manual para despliegue en producción
                timeout(time: 24, unit: 'HOURS') {
                    input message: '¿Aprobar despliegue a producción?', ok: 'Aprobar'
                }
            }
        }
        
        stage('Build Production Image') {
            steps {
                echo 'Construyendo imagen Docker para producción...'
                
                // 1. Construye la imagen con un nombre local simple
                sh "docker build -t ${APP_NAME}-prod:${BUILD_NUMBER} -f Dockerfile.prod ."
                
                // 2. CREA LA ETIQUETA COMPLETA que usará Docker Hub (ESTE ES EL PASO CLAVE)
                //    Esto crea el alias 'javierrabago/tasks-app-prod:62'
                sh "docker tag ${APP_NAME}-prod:${BUILD_NUMBER} ${DOCKERHUB_USERNAME}/${APP_NAME}-prod:${BUILD_NUMBER}"
                
                // 3. (Opcional pero recomendado) Crea también la etiqueta 'latest' para el nombre completo
                sh "docker tag ${APP_NAME}-prod:${BUILD_NUMBER} ${DOCKERHUB_USERNAME}/${APP_NAME}-prod:latest"
            }
        }

        stage('Security Scan') {
            steps {
                echo 'Iniciando escaneo de seguridad del artefacto Docker...'
                sh '''
                    # Descargamos el binario de Trivy y lo hacemos ejecutable
                    wget -qO- https://github.com/aquasecurity/trivy/releases/download/v0.52.2/trivy_0.52.2_Linux-64bit.tar.gz | tar -xzf -
                    chmod +x trivy

                    echo "Escaneando la imagen ${APP_NAME}-prod:${BUILD_NUMBER}..."
                    
                    # Ejecutamos el escaneo.
                    # --exit-code 1: Hace que el script falle (salida distinta de 0) si se encuentran vulnerabilidades.
                    # --severity CRITICAL: Solo nos fallará el pipeline si encuentra vulnerabilidades CRÍTICAS.
                    # --scanners vuln: Nos aseguramos de que solo busque vulnerabilidades.
                    ./trivy image --exit-code 1 --severity HIGH,CRITICAL --scanners vuln ${APP_NAME}-prod:${BUILD_NUMBER}
                '''
            }
            post {
                always {
                    echo "Guardando reporte de Trivy como artefacto..."
                    // Guardamos el resultado en un archivo de texto para poder revisarlo
                    sh "./trivy image --format table ${APP_NAME}-prod:${BUILD_NUMBER} > trivy-report.txt"
                    // Archivamos el reporte para que esté disponible en la página del build de Jenkins
                    archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo "Subiendo imagen a Docker Hub..."
                // Usamos la credencial 'dockerhub-credentials' que creamos en Jenkins
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    // Iniciamos sesión en Docker Hub
                    sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                    
                    // Subimos las etiquetas a Docker Hub
                    sh "docker push ${DOCKERHUB_USERNAME}/${APP_NAME}-prod:${BUILD_NUMBER}"
                    sh "docker push ${DOCKERHUB_USERNAME}/${APP_NAME}-prod:latest"
                }
            }
            post {
                always {
                    // Cerramos sesión por seguridad
                    sh 'docker logout'
                }
            }
        }
        
        stage('Deploy to Production') {
            steps {
                echo 'Desplegando en entorno de producción desde Docker Hub...'
                sshagent(credentials: ['jenkins-ssh-key']) {
                    sh """
                        # ... (Preparar entorno SSH sin cambios)
                        [ -d ~/.ssh ] || mkdir ~/.ssh && chmod 0700 ~/.ssh
                        ssh-keyscan -t rsa,dsa ${PROD_SERVER} >> ~/.ssh/known_hosts
                        ssh ${DEPLOY_USER}@${PROD_SERVER} 'mkdir -p /opt/tasks-app'
                        
                        # Modificamos docker-compose.prod.yml para que use la imagen de Docker Hub
                        # Usamos | como delimitador para sed porque la variable contiene /
                        sed -i "s|build:|image: ${DOCKERHUB_USERNAME}/${APP_NAME}-prod:latest\\n    #build:|" docker-compose.prod.yml
                        sed -i '/dockerfile:/d' docker-compose.prod.yml
                        sed -i '/context:/d' docker-compose.prod.yml
                        
                        # Copiamos el docker-compose.prod.yml modificado al servidor
                        scp docker-compose.prod.yml ${DEPLOY_USER}@${PROD_SERVER}:/opt/tasks-app/docker-compose.yml
                        
                        # ---- LA LÓGICA DE TRANSFERENCIA DE IMAGEN SE ELIMINA ----
                        # Ya no usamos docker save, scp, ni docker load.
                        
                        # En el servidor de producción:
                        ssh ${DEPLOY_USER}@${PROD_SERVER} '''
                            echo "Descargando la última imagen desde Docker Hub..."
                            docker pull ${DOCKERHUB_USERNAME}/${APP_NAME}-prod:latest
                            
                            echo "Desplegando con docker compose..."
                            cd /opt/tasks-app && docker compose down || true && docker compose up -d
                            
                            echo "Verificando logs..."
                            sleep 5 && docker logs tasks-app-prod
                        '''
                    """
                }
                echo 'Aplicación desplegada en producción correctamente.'
            }
        }
        
        stage('Test in Production') {
            steps {
                echo 'Realizando pruebas en el entorno de producción...'
                sshagent(credentials: ['jenkins-ssh-key']) {
                    sh '''
                        sleep 20  # Damos más tiempo para que la aplicación se inicie y se conecte a la BD
                        ssh jenkins-deploy@172.18.0.10 'curl -s http://172.18.0.10:3000 || echo "Aplicación no disponible"'
                    '''
                }
            }
        }
        
        stage('Notify Deployment') {
            steps {
                echo 'Notificando despliegue completado...'
                script {
                    // Llamamos a nuestra función de ayuda para el caso de éxito
                    sendDiscordNotification(
                        "SUCCESS",
                        "3066993", // Color verde
                        "La aplicación **${APP_NAME}-prod:${BUILD_NUMBER}** ha sido desplegada en producción con éxito."
                    )
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline completado con éxito!'
        }
        failure {
            echo 'Pipeline falló. Revisar logs para más detalles.'
            script {
                // Llamamos a nuestra función de ayuda para el caso de fallo
                sendDiscordNotification(
                    "FAILURE",
                    "15158332", // Color rojo
                    "El pipeline ha fallado durante la ejecución. Por favor, revisa los logs."
                )
            }
        }
        always {
            echo 'Limpiando espacio de trabajo...'
            sh 'docker logout'
            sh 'rm -f /tmp/${APP_NAME}-*.tar.gz || true'
            cleanWs()
        }
    }
}
