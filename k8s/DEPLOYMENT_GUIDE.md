# PricePilot — AWS EC2 Kubernetes Deployment Guide

## Prerequisites on EC2
- Ubuntu 22.04 EC2 instance (t2.medium or higher)
- Ports open in Security Group: 22, 80, 3000, 5000, 30300, 30500, 9090, 3001

---

## STEP 1 — Install Tools on EC2

```bash
# Docker
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Minikube (single-node K8s on EC2)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

---

## STEP 2 — Start Minikube

```bash
minikube start --driver=docker --memory=3500 --cpus=2
minikube status
```

---

## STEP 3 — Deploy PricePilot App

```bash
# Replace <YOUR_DOCKERHUB_USERNAME> in app-deployment.yaml first, then:
kubectl apply -f k8s/app-deployment.yaml

# Verify pods are running
kubectl get pods
kubectl get services
```

Expected output:
```
NAME       READY   STATUS    RESTARTS
backend    1/1     Running   0
frontend   1/1     Running   0
mongo      1/1     Running   0
```

---

## STEP 4 — Access the App

```bash
# Get EC2 public IP
curl ifconfig.me

# Get Minikube IP
minikube ip
```

- Frontend: http://<MINIKUBE_IP>:30300
- Backend API: http://<MINIKUBE_IP>:30500/api/test
- Metrics: http://<MINIKUBE_IP>:30500/metrics

> On EC2, use `minikube tunnel` or NodePort with EC2 public IP.

---

## STEP 5 — Install Prometheus + Grafana via Helm

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.adminPassword=admin123 \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

Wait for pods to be ready:
```bash
kubectl get pods -n monitoring
```

---

## STEP 6 — Apply ServiceMonitor

```bash
kubectl apply -f k8s/service-monitor.yaml

# Verify it was created
kubectl get servicemonitor -n monitoring
```

---

## STEP 7 — Access Grafana

```bash
# Port-forward Grafana to your local machine
kubectl port-forward svc/prometheus-grafana 3001:80 -n monitoring
```

Then open: http://localhost:3001

- Username: `admin`
- Password: `admin123`

Or retrieve the auto-generated password:
```bash
kubectl get secret prometheus-grafana -n monitoring \
  -o jsonpath="{.data.admin-password}" | base64 --decode
```

---

## STEP 8 — Access Prometheus UI

```bash
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring
```

Then open: http://localhost:9090

Check targets: http://localhost:9090/targets
- You should see `backend-monitor` listed as UP

---

## STEP 9 — Add Grafana Dashboard

1. Login to Grafana → Click "+" → Import Dashboard
2. Use Dashboard ID: `1860` (Node Exporter Full) for system metrics
3. For custom app metrics, go to Explore → query: `http_requests_total`

---

## DEBUGGING

### Pods not running
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### /metrics not working
```bash
kubectl exec -it <backend-pod-name> -- curl localhost:5000/metrics
```

### ServiceMonitor not scraping
```bash
# Check labels match
kubectl get svc backend -o yaml | grep labels -A5
kubectl get servicemonitor -n monitoring backend-monitor -o yaml

# Check Prometheus picked it up
kubectl logs -n monitoring prometheus-prometheus-kube-prometheus-prometheus-0 | grep backend
```

### Prometheus targets showing DOWN
```bash
# Verify backend service has named port 'http'
kubectl get svc backend -o yaml | grep -A5 ports
```

---

## Quick Reference

| Service    | NodePort | URL                              |
|------------|----------|----------------------------------|
| Frontend   | 30300    | http://<EC2-IP>:30300            |
| Backend    | 30500    | http://<EC2-IP>:30500/api/test   |
| Metrics    | 30500    | http://<EC2-IP>:30500/metrics    |
| Grafana    | 3001     | http://localhost:3001 (forwarded)|
| Prometheus | 9090     | http://localhost:9090 (forwarded)|
