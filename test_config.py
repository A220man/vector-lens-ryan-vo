#!/usr/bin/env python3
import sys
sys.path.insert(0, '/var/lib/alan-portfolio/workspaces/ryan/vector-lens-ryan-vo/backend')
from app.core.config import get_settings

s = get_settings()
print(f'secret_key length: {len(s.secret_key)}')
print(f'secret_key: {s.secret_key}')
print('Config loaded successfully!')
