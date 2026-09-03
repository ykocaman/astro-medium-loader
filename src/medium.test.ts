import { describe, expect, it } from 'vitest';
import { slugify } from './medium.js';

describe('slugify', () => {
	// Regression test for a bug that shipped in 0.3.0: a naive
	// [^a-z0-9]+ -> '-' replace silently dropped Turkish letters instead of
	// transliterating them (e.g. "için" -> "i-in", "Adımda" -> "ad-mda"),
	// producing garbled slugs for any non-ASCII title.
	it('transliterates Turkish letters instead of dropping them', () => {
		expect(slugify('Kubernetes için Prometheus ve Grafana Kurulumu')).toBe(
			'kubernetes-icin-prometheus-ve-grafana-kurulumu',
		);
		expect(slugify('7 Adımda Kubernetes Cluster Kurulumu')).toBe(
			'7-adimda-kubernetes-cluster-kurulumu',
		);
		expect(slugify('SSH ile Port Aktarımı ve Tünelleme')).toBe(
			'ssh-ile-port-aktarimi-ve-tunelleme',
		);
		expect(slugify('SVN’den Git’e Proje Taşımak')).toBe(
			'svn-den-git-e-proje-tasimak',
		);
	});

	it('leaves plain ASCII titles untouched', () => {
		expect(slugify('Web nedir?')).toBe('web-nedir');
	});

	it('trims leading/trailing separators and collapses repeats', () => {
		expect(slugify('  Hello,   World!!  ')).toBe('hello-world');
	});
});
